// src/services/logEntryService.js
import prisma from '../utils/prisma.js';
import { recordAudit } from './auditLogService.js';
import { studentScopeWhere, canAccessStudent } from './accessScope.js';
import { validateLogEntryInput } from '../utils/simesValidation.js';

const VALID_LOG_TYPES = ['DAILY_LOG', 'INTEGRATION_PAPER'];

const normalizeLogType = (value) => {
  const upper = String(value || 'DAILY_LOG').trim().toUpperCase();
  return VALID_LOG_TYPES.includes(upper) ? upper : 'DAILY_LOG';
};

export const getStudentLogs = async (studentId, filters = {}) => {
  const where = { studentId };
  if (filters.logType) where.logType = normalizeLogType(filters.logType);
  return prisma.logEntry.findMany({
    where,
    orderBy: { date: 'desc' }
  });
};

export const getAllLogs = async (filters = {}, user = null) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.logType) where.logType = normalizeLogType(filters.logType);

  // Object-level scoping: a coordinator/supervisor must not be able to read every
  // log in the institution by calling this endpoint with no filters.
  const scoped = user ? { ...where, student: studentScopeWhere(user) } : where;

  return prisma.logEntry.findMany({
    where: scoped,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
          course: true,
          section: true,
          company: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { date: 'desc' }
  });
};

export const createLog = async (studentId, date, taskDescription, options = {}) => {
  const { logType, trimmedTask, logDate } = validateLogEntryInput({
    logType: options.logType,
    date,
    taskDescription,
    submissionFile: options.submissionFile,
    submissionFileName: options.submissionFileName
  });

  const created = await prisma.logEntry.create({
    data: {
      studentId,
      date: logDate,
      logType,
      taskDescription: trimmedTask,
      status: 'PENDING',
      submissionFile: options.submissionFile ?? null,
      submissionFileName: options.submissionFileName ?? null
    }
  });

  if (logType === 'INTEGRATION_PAPER') {
    await recordAudit({
      userId: options.userId || null,
      userEmail: options.userEmail || null,
      userRole: 'STUDENT',
      action: 'SUBMIT',
      entity: 'LogEntry',
      entityId: created.id,
      description: `Submitted Integration Paper (${options.submissionFileName})`,
      metadata: { logType, fileName: options.submissionFileName }
    });
  }

  return created;
};

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

const assertStudentInScope = async (studentId, user) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, course: true, section: true, coordinatorId: true, companyId: true, supervisorEmail: true }
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

export const updateLog = async (id, studentId, taskDescription, options = {}) => {
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

  const trimmedTask = String(taskDescription ?? log.taskDescription ?? '').trim();
  if (!trimmedTask) {
    const error = new Error('Task description is required');
    error.status = 400;
    throw error;
  }

  const data = { taskDescription: trimmedTask };
  if (options.submissionFile && options.submissionFileName) {
    data.submissionFile = options.submissionFile;
    data.submissionFileName = options.submissionFileName;
    data.status = 'PENDING';
    data.comment = null;
  } else if (log.status === 'REVISION_REQUESTED') {
    data.status = 'PENDING';
  }

  return prisma.logEntry.update({
    where: { id },
    data
  });
};

export const reviewLog = async (id, status, comment, reviewer = null) => {
  if (!['APPROVED', 'REVISION_REQUESTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REVISION_REQUESTED');
    error.status = 400;
    throw error;
  }
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
    description: `${status === 'APPROVED' ? 'Approved' : 'Requested a revision on'} a student ${updated.logType === 'INTEGRATION_PAPER' ? 'Integration Paper' : 'log'}${comment ? ` — ${String(comment).slice(0, 160)}` : ''}`,
    metadata: { status, logType: updated.logType }
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
  if (actor) await assertStudentInScope(log.studentId, actor);

  await recordAudit({
    userId: actor?.userId,
    userEmail: actor?.email,
    userRole: actor?.role,
    action: 'DELETE',
    entity: 'LogEntry',
    entityId: id,
    description: `Deleted a student ${log.logType === 'INTEGRATION_PAPER' ? 'Integration Paper' : 'log'} entry`,
    metadata: { studentId: log.studentId, previousStatus: log.status, logType: log.logType }
  });
  return prisma.logEntry.delete({ where: { id } });
};
