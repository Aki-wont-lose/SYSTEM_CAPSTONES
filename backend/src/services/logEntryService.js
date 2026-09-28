// src/services/logEntryService.js
import { PrismaClient } from '@prisma/client';
import { recordAudit } from './auditLogService.js';
import { studentScopeWhere, canAccessStudent } from './accessScope.js';
const prisma = new PrismaClient();

export const getStudentLogs = async (studentId) => {
  return prisma.logEntry.findMany({
    where: { studentId },
    orderBy: { date: 'desc' }
  });
};

export const getAllLogs = async (filters = {}, user = null) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.studentId) where.studentId = filters.studentId;

  // Object-level scoping: a coordinator/supervisor must not be able to read every
  // log in the institution by calling this endpoint with no filters. Filtering is
  // applied through the `student` relation, so it composes with the filters above.
  const scoped = user ? { ...where, student: studentScopeWhere(user) } : where;

  return prisma.logEntry.findMany({
    where: scoped,
    include: { student: { select: { firstName: true, lastName: true, studentId: true } } },
    orderBy: { date: 'desc' }
  });
};

export const createLog = async (studentId, date, taskDescription) => {
  if (!taskDescription) {
    const error = new Error('Task description is required');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.create({
    data: { studentId, date: new Date(date), taskDescription, status: 'PENDING' }
  });
};

// Resolves the student that owns a log entry, 404ing when the log does not exist.
const loadLogStudentId = async (logId) => {
  const log = await prisma.logEntry.findUnique({
    where: { id: logId },
    select: { studentId: true }
  });
  if (!log) {
    const error = new Error('Log entry not found');
    error.status = 404;
    throw error;
  }
  return log.studentId;
};

// Loads a Student and enforces the caller's scope, throwing 404 when the student
// does not exist and 403 when it exists but belongs to someone else.
const assertStudentInScope = async (studentId, user) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, course: true, companyId: true, supervisorEmail: true }
  });
  if (!student) {
    const error = new Error('Student not found');
    error.status = 404;
    throw error;
  }
  if (!canAccessStudent(user, student)) {
    const error = new Error('You do not have access to this student.');
    error.status = 403;
    throw error;
  }
  return student;
};

// Staff assigns a task to a student (creates a log entry on their behalf).
// The target student must be inside the caller's scope, otherwise a supervisor
// could create log entries for any student in the institution by id.
export const assignTask = async (studentId, date, taskDescription, assignedBy, user = null) => {
  if (user) await assertStudentInScope(studentId, user);
  return prisma.logEntry.create({
    data: { studentId, date: new Date(date), taskDescription, assignedBy, status: 'PENDING' }
  });
};

export const updateLog = async (id, studentId, taskDescription) => {
  const log = await prisma.logEntry.findUnique({ where: { id } });
  if (!log) {
    const error = new Error('Log entry not found');
    error.status = 404;
    throw error;
  }
  if (log.studentId !== studentId) {
    const error = new Error('Not authorized to edit this log');
    error.status = 403;
    throw error;
  }
  if (log.status === 'APPROVED') {
    const error = new Error('Approved logs cannot be edited');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.update({
    where: { id },
    data: { taskDescription }
  });
};

export const reviewLog = async (id, status, comment, reviewer = null) => {
  if (!['APPROVED', 'REVISION_REQUESTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REVISION_REQUESTED');
    error.status = 400;
    throw error;
  }
  // The reviewer is authenticated and role-checked, but the log they are approving
  // may belong to any student. Enforce record scope before mutating it.
  if (reviewer) await assertStudentInScope((await loadLogStudentId(id)), reviewer);

  const updated = await prisma.logEntry.update({
    where: { id },
    data: { status, comment }
  });

  await recordAudit({
    userId: reviewer?.userId || null,
    userEmail: reviewer?.email || null,
    userRole: reviewer?.role || null,
    action: 'REVIEW',
    entity: 'LogEntry',
    entityId: id,
    description: `${status === 'APPROVED' ? 'Approved' : 'Requested a revision on'} a student log${comment ? ` — ${String(comment).slice(0, 160)}` : ''}`,
    metadata: { status },
  });

  return updated;
};

export const deleteLog = async (id, studentId) => {
  const log = await prisma.logEntry.findUnique({ where: { id } });
  if (!log) {
    const error = new Error('Log entry not found');
    error.status = 404;
    throw error;
  }
  if (log.studentId !== studentId) {
    const error = new Error('Not authorized to delete this log');
    error.status = 403;
    throw error;
  }
  if (log.status === 'APPROVED') {
    const error = new Error('Approved logs cannot be deleted');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.delete({ where: { id } });
};

export const deleteLogAsStaff = async (id, actor) => {
  const log = await prisma.logEntry.findUnique({ where: { id } });
  if (!log) {
    const error = new Error('Log entry not found');
    error.status = 404;
    throw error;
  }
  // Role check alone was not enough: any supervisor could delete any student's log.
  if (actor) await assertStudentInScope(log.studentId, actor);

  await recordAudit({
    userId: actor?.userId,
    userEmail: actor?.email,
    userRole: actor?.role,
    action: 'DELETE',
    entity: 'LogEntry',
    entityId: id,
    description: `Deleted a student log entry`,
    metadata: { studentId: log.studentId, previousStatus: log.status }
  });
  return prisma.logEntry.delete({ where: { id } });
};
