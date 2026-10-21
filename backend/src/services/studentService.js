// src/services/studentService.js
import { PrismaClient } from '@prisma/client';
import { isValidStudentEmail, isValidSection, ELMS_EMAIL_ERROR, ELMS_SECTION_ERROR } from '../utils/studentValidation.js';
import { studentScopeWhere } from './accessScope.js';

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

// An empty query string (`?search=&status=`) arrives as `''`, not undefined. A
// blank enum field (e.g. `ojt_status: ''`) makes Prisma throw, which surfaced as a
// 500 for coordinators/supervisors whose scope is carried inside `AND`. Drop every
// blank/undefined key so only real filters reach the database.
const dropBlank = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export const getAllStudents = async (filters = {}) => {
  const where = {};
  // Archived students are hidden from listings by default
  where.isArchived = false;

  const clean = dropBlank(filters);
  if (clean.ojt_status) {
    where.ojt_status = clean.ojt_status;
  }
  if (clean.course) {
    where.course = clean.course;
  }
  if (clean.companyId) {
    where.companyId = clean.companyId;
  }
  if (clean.supervisorEmail) {
    where.supervisorEmail = clean.supervisorEmail;
  }

  if (clean.search) {
    where.OR = [
      { firstName: { contains: clean.search } },
      { lastName: { contains: clean.search } },
      { studentId: { contains: clean.search } },
      { email: { contains: clean.search } }
    ];
  }

  // scopeWhere() hands non-admins their restriction as an `AND` array (see
  // accessScope.js). This used to be read as named keys only, so the whole `AND`
  // clause was silently dropped and every coordinator/supervisor saw the entire
  // roster. Preserve it here, combined with any explicit filters above. Each entry
  // is blank-stripped as well: an empty `ojt_status` inside the AND array was what
  // turned the coordinator list into a 500.
  if (filters.AND) {
    const andClauses = (Array.isArray(filters.AND) ? filters.AND : [filters.AND])
      .map((clause) => dropBlank(clause))
      .filter((clause) => Object.keys(clause).length > 0);
    if (andClauses.length) {
      where.AND = andClauses;
    }
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

  // Look up required OJT hours for this course from the admin-maintained config
  let requiredHours = null;
  if (studentData.course) {
    const hoursCfg = await prisma.ojtHoursConfig.findUnique({
      where: { course: studentData.course },
      select: { requiredHours: true }
    });
    if (hoursCfg) requiredHours = hoursCfg.requiredHours;
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
        requiredHours: requiredHours ?? studentData.requiredHours ?? null,
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

    // Moving a student to another course also moves them to that course's
    // required OJT hours, unless the caller set requiredHours explicitly.
    if (sanitized.course !== undefined && sanitized.requiredHours === undefined) {
      const hoursCfg = await prisma.ojtHoursConfig.findUnique({
        where: { course: sanitized.course },
        select: { requiredHours: true }
      });
      if (hoursCfg) sanitized.requiredHours = hoursCfg.requiredHours;
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
      select: { userId: true, isArchived: true }
    });

    if (!student) {
      const err = new Error('Student not found');
      err.status = 404;
      throw err;
    }

    if (student.isArchived) {
      return { success: true, archived: true };
    }

    // Soft-archive instead of hard delete so audit trails and history stay intact
    await prisma.student.update({
      where: { id: studentId },
      data: { isArchived: true, archivedAt: new Date() }
    });
    // Archive the linked login account too so its email/studentId can be freed
    try {
      await prisma.user.update({
        where: { id: student.userId },
        data: { isArchived: true, archivedAt: new Date() }
      });
    } catch (_) {
      // user already gone - ignore
    }
    return { success: true, archived: true };
  } catch (error) {
    throw error;
  }
};

export const getStudentStats = async (user = null) => {
  // Coordinators only see students in their own course; admins and supervisors
  // see everything (supervisors are already scoped elsewhere when they query).
  const scope = user ? studentScopeWhere(user) : {};
  const where = { isArchived: false, ...scope };

  const [total, active, completed, pending, onHold, byCourse, activeCompanies] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.count({ where: { ...where, ojt_status: 'ONGOING' } }),
    prisma.student.count({ where: { ...where, ojt_status: 'COMPLETED' } }),
    prisma.student.count({ where: { ...where, ojt_status: 'NOT_STARTED' } }),
    prisma.student.count({ where: { ...where, ojt_status: 'ON_HOLD' } }),
    prisma.student.groupBy({
      by: ['course'],
      where,
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
