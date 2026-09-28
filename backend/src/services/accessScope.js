// src/services/accessScope.js
//
// Object-level authorization.
//
// verifyRole() answers "which ROLES may call this endpoint".
// These helpers answer " WHICH RECORDS may this caller touch".
//
// Before this module, role checks existed but record ownership did not: any
// SUPERVISOR or COORDINATOR could read or mutate ANY student in the institution
// simply by putting another student's id in the URL. Every endpoint that accepts
// a record id from the client must go through here.
//
// Design rules:
//  - Fail CLOSED. An unknown or missing role yields a match-nothing clause, never
//    "return everything".
//  - Pure functions, no Prisma import, so they are trivially testable.

export const STAFF_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERVISOR'];

// Matches no real row. Used as the fail-closed value for an id/unique where clause.
const NO_MATCH = { id: '__no_access__' };

export const isStaff = (user) => Boolean(user) && STAFF_ROLES.includes(user.role);

/**
 * Prisma `where` fragment restricting a Student query to the caller's scope.
 * Spread into a Student `where`, or AND it with an existing filter.
 */
export const studentScopeWhere = (user) => {
  if (!user) return NO_MATCH;
  if (user.role === 'ADMIN') return {};

  if (user.role === 'COORDINATOR') {
    // A coordinator owns exactly one course. If the token has none, they own nothing.
    return user.coordinatorCourse ? { course: user.coordinatorCourse } : NO_MATCH;
  }

  if (user.role === 'SUPERVISOR') {
    // A supervisor owns students placed at their company OR reporting to them by email.
    const email = user.supervisorEmail || user.email;
    const clauses = [];
    if (user.supervisorCompanyId) clauses.push({ companyId: user.supervisorCompanyId });
    if (email) clauses.push({ supervisorEmail: email });
    // No company and no email => an unassigned supervisor owns NO students.
    // (Previously this branch showed the entire roster - that was the backdoor.)
    return clauses.length ? { OR: clauses } : NO_MATCH;
  }

  // STUDENT (or anything unrecognised) may never query the student collection.
  return NO_MATCH;
};

/**
 * True when `user` is allowed to act on `student`.
 * `student` must be a Student row that includes `companyId`, `course` and `supervisorEmail`.
 */
export const canAccessStudent = (user, student) => {
  if (!user || !student) return false;
  if (user.role === 'ADMIN') return true;

  if (user.role === 'COORDINATOR') {
    return Boolean(user.coordinatorCourse) && student.course === user.coordinatorCourse;
  }

  if (user.role === 'SUPERVISOR') {
    const email = user.supervisorEmail || user.email;
    if (user.supervisorCompanyId && student.companyId === user.supervisorCompanyId) return true;
    if (email && student.supervisorEmail === email) return true;
    return false;
  }

  return false;
};

/** Throws a 403 unless the caller may act on this student. */
export const assertStudentAccess = (user, student, message) => {
  if (!canAccessStudent(user, student)) {
    const error = new Error(message || 'You do not have access to this record.');
    error.status = 403;
    throw error;
  }
  return student;
};

/**
 * Restrict a `where` clause to the caller's scope. Use for list endpoints so a
 * supervisor cannot enumerate the whole institution via query params.
 */
export const scopeWhere = (user, where = {}) => {
  if (!user) return { ...where, ...NO_MATCH };
  if (user.role === 'ADMIN') return where;
  return { AND: [where, studentScopeWhere(user)] };
};

/** True when the caller owns this notification/messaging record. */
export const ownsRecord = (user, record) =>
  Boolean(user) && Boolean(record) && record.userId === user.userId;
