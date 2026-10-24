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

const DEFAULT_WORKING_DAYS = 'Monday - Friday';
const DEFAULT_WORKING_HOURS = '8:00 AM - 5:00 PM';

const hydrateStudentPlacement = (student) => {
  if (!student || !student.company) return student;
  return {
    ...student,
    supervisorName: student.supervisorName || student.company.contactPerson || null,
    supervisorContact: student.supervisorContact || student.company.contactNumber || null,
    supervisorEmail: student.supervisorEmail || student.company.email || null,
    workingDays: student.workingDays || DEFAULT_WORKING_DAYS,
    workingHours: student.workingHours || DEFAULT_WORKING_HOURS
  };
};

const resolveCompanyPlacementDefaults = async (companyId, existing = {}) => {
  const [companySupervisor, companyRow] = await Promise.all([
    prisma.user.findFirst({
      where: { role: 'SUPERVISOR', supervisorCompanyId: companyId, isArchived: false },
      select: { email: true, firstName: true, lastName: true, contactNumber: true }
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { contactPerson: true, contactNumber: true, email: true }
    })
  ]);

  const supFullName = companySupervisor
    ? [companySupervisor.firstName, companySupervisor.lastName].filter(Boolean).join(' ').trim()
    : '';
  const preferredName =
    companyRow?.contactPerson ||
    supFullName ||
    companySupervisor?.email ||
    null;

  return {
    supervisorName: existing.supervisorName || preferredName,
    supervisorEmail: existing.supervisorEmail
      ? normalizeEmail(existing.supervisorEmail)
      : (companySupervisor?.email || companyRow?.email || null),
    supervisorContact:
      existing.supervisorContact ||
      companySupervisor?.contactNumber ||
      companyRow?.contactNumber ||
      null,
    workingDays: existing.workingDays || DEFAULT_WORKING_DAYS,
    workingHours: existing.workingHours || DEFAULT_WORKING_HOURS
  };
};

export const getAllStudents = async (filters = {}) => {
  const where = {
    isArchived: false
  };

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

  let searchTerm = clean.search ? String(clean.search).trim() : '';
  const andClauses = [];

  if (Array.isArray(clean.OR) && clean.OR.length > 0) {
    andClauses.push({ OR: clean.OR });
  }

  // scopeWhere() hands non-admins their restriction as an `AND` array (see
  // accessScope.js). Strip blank keys and extract `search` from any inner clause
  // so Prisma never receives an unknown `search` field or blank enum value.
  if (filters.AND) {
    const rawClauses = Array.isArray(filters.AND) ? filters.AND : [filters.AND];
    for (const rawClause of rawClauses) {
      const stripped = dropBlank(rawClause);
      if (stripped.search) {
        if (!searchTerm) searchTerm = String(stripped.search).trim();
        delete stripped.search;
      }
      if (Object.keys(stripped).length > 0) {
        andClauses.push(stripped);
      }
    }
  }

  if (searchTerm) {
    andClauses.push({
      OR: [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { studentId: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { course: { contains: searchTerm, mode: 'insensitive' } }
      ]
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  const rows = await prisma.student.findMany({
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
  return rows.map(hydrateStudentPlacement);
};

export const getStudentById = async (studentId) => {
  const student = await prisma.student.findUnique({
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
  return hydrateStudentPlacement(student);
};

export const getStudentByUserId = async (userId) => {
  const student = await prisma.student.findUnique({
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
  return hydrateStudentPlacement(student);
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

    let placementDefaults = {
      supervisorName: studentData.supervisorName || null,
      supervisorEmail: studentData.supervisorEmail ? normalizeEmail(studentData.supervisorEmail) : null,
      supervisorContact: studentData.supervisorContact || null,
      workingDays: studentData.workingDays || null,
      workingHours: studentData.workingHours || null
    };
    if (studentData.companyId) {
      placementDefaults = await resolveCompanyPlacementDefaults(studentData.companyId, placementDefaults);
    }

    // Create student record
    const student = await prisma.student.create({
      data: {
        ...studentData,
        email,
        ...placementDefaults,
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
        },
        company: true
      }
    });

    return {
      student: hydrateStudentPlacement(student),
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
      select: {
        email: true,
        section: true,
        companyId: true,
        supervisorName: true,
        supervisorEmail: true,
        supervisorContact: true,
        workingDays: true,
        workingHours: true
      }
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

    // When assigning a student to a company, automatically populate supervisor and working schedule defaults
    if (sanitized.companyId) {
      const companyChanged = sanitized.companyId !== current?.companyId;
      const defaults = await resolveCompanyPlacementDefaults(sanitized.companyId, {
        supervisorName: sanitized.supervisorName || (!companyChanged ? current?.supervisorName : null),
        supervisorEmail: sanitized.supervisorEmail || (!companyChanged ? current?.supervisorEmail : null),
        supervisorContact: sanitized.supervisorContact || (!companyChanged ? current?.supervisorContact : null),
        workingDays: sanitized.workingDays || current?.workingDays || null,
        workingHours: sanitized.workingHours || current?.workingHours || null
      });
      Object.assign(sanitized, defaults);
    } else if (sanitized.companyId === null) {
      if (updateData.supervisorEmail === undefined) sanitized.supervisorEmail = null;
      if (updateData.supervisorName === undefined) sanitized.supervisorName = null;
      if (updateData.supervisorContact === undefined) sanitized.supervisorContact = null;
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: sanitized,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        },
        company: true
      }
    });
    return hydrateStudentPlacement(updated);
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
