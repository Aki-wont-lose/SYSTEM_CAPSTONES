// src/services/studentService.js
import { PrismaClient } from '@prisma/client';
import { isValidStudentEmail, isValidSection, ELMS_EMAIL_ERROR, ELMS_SECTION_ERROR } from '../utils/studentValidation.js';

const prisma = new PrismaClient();

const badRequest = (message) => {
  const err = new Error(message);
  err.status = 400;
  return err;
};

// Emails are case-insensitive, so store one canonical form. Validated input that
// passed with surrounding whitespace or mixed case is normalized before it is
// persisted, otherwise Microsoft sign-in silently fails to match the account.
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const getAllStudents = async (filters = {}) => {
  const where = {};
  
  if (filters.ojt_status) {
    where.ojt_status = filters.ojt_status;
  }
  if (filters.course) {
    where.course = filters.course;
  }
  if (filters.companyId) {
    where.companyId = filters.companyId;
  }
  if (filters.supervisorEmail) {
    where.supervisorEmail = filters.supervisorEmail;
  }
  
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { studentId: { contains: filters.search } },
      { email: { contains: filters.search } }
    ];
  }

  // scopeWhere() hands non-admins their restriction as an `AND` array (see
  // accessScope.js). This used to be read as named keys only, so the whole `AND`
  // clause was silently dropped and every coordinator/supervisor saw the entire
  // roster. Preserve it here, combined with any explicit filters above.
  if (filters.AND) {
    where.AND = [...(Array.isArray(filters.AND) ? filters.AND : [filters.AND])];
  }

  return prisma.student.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true
        }
      },
      company: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getStudentById = async (studentId) => {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          role: true
        }
      },
      company: true,
      attendance: {
        orderBy: { date: 'desc' },
        take: 30
      }
    }
  });
};

export const getStudentByUserId = async (userId) => {
  return prisma.student.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          theme: true
        }
      },
      company: true
    }
  });
};

export const createStudent = async (studentData, userData) => {
  // Enforce the institutional rules here, not only in the form, so a direct API
  // call (or a CSV batch row) can never create a student with a non-ELMS email
  // or an off-catalog section. Year level is derived from the section, so a
  // valid section is required.
  const email = normalizeEmail(studentData.email || userData?.email || '');
  if (!isValidStudentEmail(email)) {
    throw badRequest(ELMS_EMAIL_ERROR);
  }
  if (!isValidSection(studentData.section)) {
    throw badRequest(ELMS_SECTION_ERROR);
  }

  try {
    // Students sign in with Microsoft only, so no password is stored for them.
    const user = await prisma.user.create({
      data: {
        email,
        password: null,
        role: 'STUDENT',
        mustChangePassword: false
      }
    });

    // Create student record
    const student = await prisma.student.create({
      data: {
        ...studentData,
        email,
        contactNumber: studentData.contactNumber ?? '',
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    return {
      student,
      temporaryPassword: null
    };
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      const err = new Error(`${field} already exists`);
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

// Staff-editable student fields, verified against the Student model in
// schema.prisma. The raw request body is NEVER passed to Prisma: doing so let a
// coordinator set completedHours, ojt_status, companyId and supervisorEmail on any
// student in any course - i.e. edit their own grades and OJT assignment.
//
// Deliberately excluded:
//   completedHours  - derived from attendance records, never client-settable
//   id/userId       - identity, must not be reassigned
//   createdAt/updatedAt
// Note: any field not in this list is silently dropped, so a typo here can never
// cause a Prisma "unknown argument" runtime error.
export const STAFF_EDITABLE_STUDENT_FIELDS = [
  'firstName',
  'lastName',
  'studentId',
  'course',
  'section',
  'email',
  'contactNumber',
  'profilePicture',
  'ojt_status',
  'requiredHours',
  'companyId',
  'supervisorName',
  'supervisorEmail',
  'supervisorContact',
  'workingDays',
  'workingHours'
];

export const updateStudent = async (studentId, updateData) => {
  try {
    const sanitized = {};
    for (const field of STAFF_EDITABLE_STUDENT_FIELDS) {
      if (updateData[field] !== undefined) sanitized[field] = updateData[field];
    }
    if (sanitized.email !== undefined) sanitized.email = normalizeEmail(sanitized.email);

    // Validate email/section only when they actually change, so legacy records
    // (e.g. section "IT-401") stay editable without forcing a data migration,
    // while any NEW value must follow the strict ELMS rules.
    const current = await prisma.student.findUnique({
      where: { id: studentId },
      select: { email: true, section: true }
    });
    if (sanitized.email !== undefined && sanitized.email !== current?.email && !isValidStudentEmail(sanitized.email)) {
      throw badRequest(ELMS_EMAIL_ERROR);
    }
    if (sanitized.section !== undefined && sanitized.section !== current?.section && !isValidSection(sanitized.section)) {
      throw badRequest(ELMS_SECTION_ERROR);
    }

    return prisma.student.update({
      where: { id: studentId },
      data: sanitized,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        }
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Student not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const deleteStudent = async (studentId) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true }
    });

    if (!student) {
      const err = new Error('Student not found');
      err.status = 404;
      throw err;
    }

    // Delete student and its linked User so email/studentId can be reused
    await prisma.student.delete({
      where: { id: studentId }
    });
    // Remove the login account as well (was left orphaned before, causing "email already exists")
    try {
      await prisma.user.delete({ where: { id: student.userId } });
    } catch (_) {
      // user already gone or cascade - ignore
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const getStudentStats = async () => {
  const [total, active, completed, pending, onHold, byCourse, activeCompanies] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({
      where: { ojt_status: 'ONGOING' }
    }),
    prisma.student.count({
      where: { ojt_status: 'COMPLETED' }
    }),
    prisma.student.count({
      where: { ojt_status: 'NOT_STARTED' }
    }),
    prisma.student.count({
      where: { ojt_status: 'ON_HOLD' }
    }),
    prisma.student.groupBy({
      by: ['course'],
      _count: { _all: true },
      orderBy: { course: 'asc' }
    }),
    prisma.company.count({
      where: { status: 'ACTIVE', students: { some: {} } }
    })
  ]);

  const courses = {};
  for (const row of byCourse) {
    courses[row.course || 'Unassigned'] = row._count._all;
  }

  return {
    total,
    active,
    completed,
    pending,
    onHold,
    onTrack: total - completed,
    byCourse: courses,
    partnerCompanies: activeCompanies,
    totalStudents: total
  };
};

export const updateStudentHours = async (studentId, completedHours) => {
  try {
    return prisma.student.update({
      where: { id: studentId },
      data: {
        completedHours,
        ojt_status: completedHours >= 486 ? 'COMPLETED' : 'ONGOING'
      }
    });
  } catch (error) {
    throw error;
  }
};
