// src/services/attendanceService.js
import { PrismaClient } from '@prisma/client';
import { recordAudit } from './auditLogService.js';
import { scopeWhere } from './accessScope.js';

const prisma = new PrismaClient();

// Returns a Date representing midnight UTC of the given date's LOCAL
// calendar day (Y/M/D from the server's local timezone). Passing a plain
// JS Date through `.setHours(0,0,0,0)` and letting Prisma serialize it for
// a `@db.Date` column is ambiguous — Prisma/MySQL ultimately store the UTC
// Y-M-D, which can silently roll back a day for timezones ahead of UTC
// (e.g. Philippines, UTC+8) around local midnight. Building the UTC date
// explicitly from the local Y/M/D avoids that off-by-one entirely.
const toLocalDateOnly = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// Photo columns are no longer written or displayed, so they are excluded from
// every response (they are large base64 strings). Existing data is kept.
const ATTENDANCE_FIELDS = {
  id: true,
  studentId: true,
  date: true,
  timeIn: true,
  timeOut: true,
  renderedHours: true,
  status: true,
  notes: true,
  reviewStatus: true,
  reviewRemarks: true,
  reviewedById: true,
  reviewedByName: true,
  submittedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true
};

// `limit` arrives from req.query, so it is client-controlled. A non-numeric or
// negative value previously reached Prisma's `take` and rejected the request with a
// 500; an uncapped value could ask for the student's entire history.
export const getAttendanceHistory = async (studentId, limit = 30) => {
  const parsed = parseInt(limit, 10);
  const take = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : 30;
  return prisma.attendance.findMany({
    where: { studentId },
    select: ATTENDANCE_FIELDS,
    orderBy: { date: 'desc' },
    take
  });
};

export const getAttendanceByDate = async (studentId, date) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return prisma.attendance.findFirst({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  });
};

// ---------------------------------------------------------------------------
// Supervisor attendance recording
//
// The Company Supervisor is the only role that records time in / time out.
// Students never write attendance. A supervisor entry is final on save, so the
// existing reviewedBy* columns are reused as "recorded by / last modified by"
// and reviewedAt as the modification timestamp - no schema migration needed.
// ---------------------------------------------------------------------------

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Accepts a Date, an ISO timestamp, or a plain "YYYY-MM-DD" string and returns
// midnight UTC of that calendar day (the shape the @db.Date column stores).
const parseDateOnly = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toLocalDateOnly(value);
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  return toLocalDateOnly(new Date());
};

// A supervisor may record for today (and up to one day ahead of the server's
// UTC clock, because the Philippines is UTC+8) but never for a future duty day.
const assertRecordableDate = (dateOnly) => {
  const serverToday = toLocalDateOnly(new Date());
  const tomorrow = new Date(serverToday.getTime() + 24 * 60 * 60 * 1000);
  if (dateOnly.getTime() > tomorrow.getTime()) {
    throw httpError(400, 'Attendance cannot be recorded for a future date.');
  }
};

// Accepts a Date or ISO string. Missing values mean "now".
const resolveTimestamp = (value, label) => {
  if (value === undefined || value === null || value === '') return new Date();
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw httpError(400, `${label} is not a valid date/time.`);
  }
  if (parsed.getTime() > Date.now() + 10 * 60 * 1000) {
    throw httpError(400, `${label} cannot be in the future.`);
  }
  return parsed;
};

const dateKey = (dateOnly) => new Date(dateOnly).toISOString().slice(0, 10);

const studentName = (student) =>
  student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.studentId || 'student' : 'student';

const actorName = (actor) =>
  actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || 'Staff' : null;

const approvalStamp = (actor) => ({
  reviewStatus: 'APPROVED',
  reviewedById: actor?.userId || null,
  reviewedByName: actorName(actor),
  reviewedAt: new Date(),
  reviewRemarks: null
});

export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

export const resolveStatus = (value, fallback = 'PRESENT') => {
  if (value === undefined || value === null || value === '') return fallback;
  const candidate = String(value).trim().toUpperCase();
  if (!ATTENDANCE_STATUSES.includes(candidate)) {
    throw httpError(400, 'Attendance status must be PRESENT, LATE, ABSENT or EXCUSED.');
  }
  return candidate;
};

// Accumulated OJT hours come only from APPROVED records that have both a time
// in and a time out. Incomplete and rejected entries never count.
export const isCountableRecord = (record) =>
  Boolean(record && record.reviewStatus === 'APPROVED' && record.timeIn && record.timeOut);

const COUNTABLE_WHERE = {
  reviewStatus: 'APPROVED',
  timeIn: { not: null },
  timeOut: { not: null }
};

// Single place that recomputes Student.completedHours. Never trust a client value.
export const syncStudentHours = async (studentId) => {
  const total = await prisma.attendance.aggregate({
    where: { studentId, ...COUNTABLE_WHERE },
    _sum: { renderedHours: true }
  });
  const hours = Math.round(total._sum.renderedHours || 0);
  await prisma.student.update({
    where: { id: studentId },
    data: { completedHours: hours }
  });
  return hours;
};

// Attendance writes are always audited. A logging failure must never discard a
// saved record, so it is reported but not rethrown.
const auditAttendance = async ({ actor, student, record, action, description }) => {
  try {
    await recordAudit({
      userId: actor?.userId || null,
      userEmail: actor?.email || null,
      userRole: actor?.role || null,
      action,
      entity: 'Attendance',
      entityId: record.id,
      description,
      metadata: {
        studentId: record.studentId,
        studentNumber: student?.studentId || null,
        date: dateKey(record.date),
        timeIn: record.timeIn,
        timeOut: record.timeOut,
        renderedHours: record.renderedHours,
        status: record.status,
        reviewStatus: record.reviewStatus
      }
    });
  } catch (error) {
    console.error('Failed to write attendance audit log:', error.message);
  }
};

export const recordTimeInForStudent = async (student, options = {}, actor = null) => {
  if (!student?.id) throw httpError(400, 'A student must be selected.');

  const { date, timeIn, status, notes } = options;
  const day = parseDateOnly(date);
  assertRecordableDate(day);

  const existing = await prisma.attendance.findFirst({
    where: { studentId: student.id, date: day }
  });

  if (existing?.timeIn) {
    throw httpError(400, `Time in for ${dateKey(day)} has already been recorded.`);
  }

  const payload = {
    studentId: student.id,
    date: day,
    timeIn: resolveTimestamp(timeIn, 'Time in'),
    status: resolveStatus(status),
    ...approvalStamp(actor)
  };
  if (notes !== undefined) payload.notes = notes ? String(notes).slice(0, 500) : null;

  let saved;
  try {
    saved = existing
      ? await prisma.attendance.update({ where: { id: existing.id }, data: payload })
      : await prisma.attendance.create({ data: payload });
  } catch (error) {
    if (error.code === 'P2002') {
      throw httpError(400, `Attendance for ${dateKey(day)} already exists. Please refresh and try again.`);
    }
    throw error;
  }

  await syncStudentHours(student.id);
  await auditAttendance({
    actor,
    student,
    record: saved,
    action: 'CREATE',
    description: `Recorded time in for ${studentName(student)} on ${dateKey(day)}`
  });
  return saved;
};

export const recordTimeOutForStudent = async (student, options = {}, actor = null) => {
  if (!student?.id) throw httpError(400, 'A student must be selected.');

  const { date, timeOut, notes } = options;
  const day = parseDateOnly(date);
  assertRecordableDate(day);

  const existing = await prisma.attendance.findFirst({
    where: { studentId: student.id, date: day }
  });

  if (!existing || !existing.timeIn) {
    throw httpError(400, `No time in has been recorded for ${dateKey(day)} yet.`);
  }
  if (existing.timeOut) {
    throw httpError(400, `Time out for ${dateKey(day)} has already been recorded.`);
  }

  const timeOutAt = resolveTimestamp(timeOut, 'Time out');
  const timeInAt = new Date(existing.timeIn);
  const diffMs = timeOutAt.getTime() - timeInAt.getTime();

  if (diffMs <= 0) throw httpError(400, 'Time out must be after time in.');
  if (diffMs > 24 * 60 * 60 * 1000) {
    throw httpError(400, 'A single attendance record cannot span more than 24 hours.');
  }

  const payload = {
    timeOut: timeOutAt,
    renderedHours: parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)),
    ...approvalStamp(actor)
  };
  if (notes !== undefined) payload.notes = notes ? String(notes).slice(0, 500) : null;

  const saved = await prisma.attendance.update({ where: { id: existing.id }, data: payload });

  await syncStudentHours(student.id);
  await auditAttendance({
    actor,
    student,
    record: saved,
    action: 'UPDATE',
    description: `Recorded time out for ${studentName(student)} on ${dateKey(day)} (${payload.renderedHours}h)`
  });
  return saved;
};

// Only these columns may ever be written through updateAttendanceRecord.
// Previously the raw req.body was spread straight into prisma.attendance.update,
// which let any caller set reviewStatus, reviewedByName, studentId and more.
// `renderedHours` is deliberately excluded: it is always derived from the times.
const EDITABLE_ATTENDANCE_FIELDS = ['timeIn', 'timeOut', 'notes', 'status'];

// null clears the value (used when a wrong time must be removed); anything else
// must be a real timestamp.
const resolveEditTime = (value, label) => (value === null ? null : resolveTimestamp(value, label));

export const updateAttendanceRecord = async (attendanceId, updateData = {}, actor = null) => {
  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId }
  });

  if (!existing) throw httpError(404, 'Attendance record not found');

  // Allow-list: silently drop anything not explicitly permitted.
  const sanitized = {};
  for (const field of EDITABLE_ATTENDANCE_FIELDS) {
    if (updateData[field] !== undefined) sanitized[field] = updateData[field];
  }
  if (Object.keys(sanitized).length === 0) {
    throw httpError(400, 'No editable fields supplied');
  }

  if (sanitized.status !== undefined) {
    sanitized.status = resolveStatus(sanitized.status, existing.status);
  }
  if (sanitized.notes !== undefined) {
    sanitized.notes = sanitized.notes ? String(sanitized.notes).slice(0, 500) : null;
  }
  if (sanitized.timeIn !== undefined) sanitized.timeIn = resolveEditTime(sanitized.timeIn, 'Time in');
  if (sanitized.timeOut !== undefined) sanitized.timeOut = resolveEditTime(sanitized.timeOut, 'Time out');

  // Always recompute the hours; never accept a client-supplied total.
  const nextTimeIn = sanitized.timeIn !== undefined ? sanitized.timeIn : existing.timeIn;
  const nextTimeOut = sanitized.timeOut !== undefined ? sanitized.timeOut : existing.timeOut;

  if (nextTimeIn && nextTimeOut) {
    const diffMs = new Date(nextTimeOut).getTime() - new Date(nextTimeIn).getTime();
    if (diffMs <= 0) throw httpError(400, 'Time out must be after time in.');
    if (diffMs > 24 * 60 * 60 * 1000) {
      throw httpError(400, 'A single attendance record cannot span more than 24 hours.');
    }
    sanitized.renderedHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
  } else if (sanitized.timeIn !== undefined || sanitized.timeOut !== undefined) {
    // A half-filled day renders no hours at all.
    sanitized.renderedHours = 0;
  }

  // A correction by an authorised staff member is authoritative: the record goes
  // back to APPROVED and the corrector is stamped as the last modifier.
  Object.assign(sanitized, approvalStamp(actor));

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: sanitized
  });

  await syncStudentHours(updated.studentId);

  const student = await prisma.student.findUnique({
    where: { id: updated.studentId },
    select: { id: true, studentId: true, firstName: true, lastName: true }
  });

  await auditAttendance({
    actor,
    student,
    record: updated,
    action: 'UPDATE',
    description: `Corrected attendance for ${studentName(student)} on ${dateKey(updated.date)}`,
  });

  return updated;
};

export const getMonthlyAttendance = async (studentId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return prisma.attendance.findMany({
    where: {
      studentId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    select: ATTENDANCE_FIELDS,
    orderBy: { date: 'asc' }
  });
};

export const getStudentSummary = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  const attendance = await prisma.attendance.findMany({
    where: { studentId },
    select: ATTENDANCE_FIELDS,
    orderBy: { date: 'desc' }
  });

  // Only approved, complete days count toward the OJT total. A record without a
  // time out (or one that was rejected) contributes zero hours.
  const counted = attendance.filter(isCountableRecord);
  const totalHours = counted.reduce((sum, rec) => sum + (rec.renderedHours || 0), 0);
  const roundedHours = Math.round(totalHours);
  const requiredHours = Number(student?.requiredHours || 0);
  const remainingHours = Math.max(0, requiredHours - roundedHours);

  return {
    student,
    attendance: {
      totalRecords: attendance.length,
      totalHours: roundedHours,
      requiredHours,
      remainingHours,
      progressPercent: requiredHours > 0
        ? Math.min(100, Math.round((roundedHours / requiredHours) * 100))
        : 0,
      presentDays: counted.filter(rec => rec.status === 'PRESENT').length,
      absentDays: counted.filter(rec => rec.status === 'ABSENT').length,
      lateDays: counted.filter(rec => rec.status === 'LATE').length,
      incompleteRecords: attendance.filter(rec => !rec.timeIn || !rec.timeOut).length,
      review: {
        draft: attendance.filter((rec) => rec.reviewStatus === 'DRAFT').length,
        submitted: attendance.filter((rec) => rec.reviewStatus === 'SUBMITTED').length,
        approved: attendance.filter((rec) => rec.reviewStatus === 'APPROVED').length,
        rejected: attendance.filter((rec) => rec.reviewStatus === 'REJECTED').length
      }
    }
  };
};

// Attendance used to be student-submitted, so a day had to be sent for approval.
// Supervisors now record the entry directly, which lands as APPROVED - the
// submit step no longer exists. REVIEW_TRANSITIONS is kept for legacy rows that
// are still sitting in SUBMITTED and need a decision from an authorised officer.
const REVIEW_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'DRAFT'],
  REJECTED: ['DRAFT'],
  APPROVED: ['DRAFT']
};

export const canTransitionReview = (from, to) => (REVIEW_TRANSITIONS[from] || []).includes(to);

// The supervisor decides a legacy submitted DTR (Admin has no attendance access)
export const reviewDtr = async (attendanceId, reviewer, status, remarks) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REJECTED');
    error.status = 400;
    throw error;
  }

  if (status === 'REJECTED' && !remarks) {
    const error = new Error('A reason is required when rejecting a DTR');
    error.status = 400;
    throw error;
  }

  const record = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!record) {
    const error = new Error('DTR record not found');
    error.status = 404;
    throw error;
  }

  if (!canTransitionReview(record.reviewStatus, status)) {
    const error = new Error(
      record.reviewStatus === 'SUBMITTED'
        ? 'This DTR was already reviewed'
        : 'Only a submitted DTR can be reviewed'
    );
    error.status = 400;
    throw error;
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      reviewStatus: status,
      reviewRemarks: remarks ? String(remarks) : null,
      reviewedById: reviewer?.userId || null,
      reviewedByName: reviewer ? `${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email || 'Staff' : null,
      reviewedAt: new Date()
    }
  });

  // Approving a legacy submitted day must immediately feed the student's total.
  await syncStudentHours(record.studentId);

  // A logging failure must never discard a saved decision.
  try {
    await recordAudit({
      userId: reviewer?.userId || null,
      userEmail: reviewer?.email || null,
      userRole: reviewer?.role || null,
      action: 'REVIEW',
      entity: 'Attendance',
      entityId: attendanceId,
      description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} the DTR for ${record.date}${remarks ? ` — ${String(remarks).slice(0, 160)}` : ''}`,
      metadata: { status, date: record.date, studentId: record.studentId },
    });
  } catch (error) {
    console.error('Failed to write attendance review audit log:', error.message);
  }

  return updated;
};

// Staff review queue: submitted DTRs awaiting a decision, newest first
export const getDtrReviewQueue = async (filters = {}, user = null) => {
  const safeFilters = filters || {};
  const where = {};
  if (safeFilters.status) where.reviewStatus = safeFilters.status;
  else where.reviewStatus = 'SUBMITTED';
  if (safeFilters.studentId) where.studentId = safeFilters.studentId;
  const studentFilter = { isArchived: false };
  if (safeFilters.course) studentFilter.course = safeFilters.course;
  where.student = user ? scopeWhere(user, studentFilter) : studentFilter;
  if (safeFilters.from || safeFilters.to) {
    where.date = {};
    if (safeFilters.from) where.date.gte = new Date(safeFilters.from);
    if (safeFilters.to) where.date.lte = new Date(safeFilters.to);
  }

  const records = await prisma.attendance.findMany({
    where,
    select: {
      ...ATTENDANCE_FIELDS,
      student: { select: { id: true, studentId: true, firstName: true, lastName: true, course: true, section: true } }
    },
    orderBy: [{ date: 'desc' }],
    take: Math.min(parseInt(safeFilters.limit) || 100, 500)
  });

  const grouped = records.reduce((acc, record) => {
    const key = record.studentId;
    if (!acc[key]) {
      acc[key] = {
        studentId: record.student.id,
        studentNumber: record.student.studentId,
        name: `${record.student.firstName} ${record.student.lastName}`,
        course: record.student.course,
        section: record.student.section,
        submitted: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        hours: 0,
        oldest: null
      };
    }
    const entry = acc[key];
    if (record.reviewStatus === 'SUBMITTED') entry.submitted += 1;
    if (record.reviewStatus === 'APPROVED') entry.approved += 1;
    if (record.reviewStatus === 'REJECTED') entry.rejected += 1;
    if (record.reviewStatus === 'DRAFT') entry.draft += 1;
    entry.hours += record.renderedHours;
    if (!entry.oldest || record.date < new Date(entry.oldest)) entry.oldest = record.date;
    return acc;
  }, {});

  return {
    total: records.length,
    records,
    byStudent: Object.values(grouped)
  };
};

// Editing a DTR after review sends it back to draft so it can be resubmitted
export const reopenDtr = async (attendanceId) =>
  prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      reviewStatus: 'DRAFT',
      submittedAt: null,
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewRemarks: null
    }
  });

// Flat attendance list for the monitoring screens. The caller's scope is applied
// to the related student, so a supervisor only ever sees their own company and a
// coordinator only their own program.
export const getAttendanceRecords = async (filters = {}, user = null) => {
  const safe = filters || {};
  const where = {};

  if (safe.studentId) where.studentId = safe.studentId;
  if (safe.status) where.status = resolveStatus(safe.status, 'PRESENT');
  if (safe.reviewStatus) {
    const reviewStatus = String(safe.reviewStatus).trim().toUpperCase();
    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(reviewStatus)) {
      throw httpError(400, 'Review status must be DRAFT, SUBMITTED, APPROVED or REJECTED.');
    }
    where.reviewStatus = reviewStatus;
  }
  if (String(safe.incomplete) === 'true') {
    where.OR = [{ timeIn: null }, { timeOut: null }];
  }

  const studentFilter = { isArchived: false };
  if (safe.course) studentFilter.course = safe.course;
  where.student = user ? scopeWhere(user, studentFilter) : studentFilter;

  if (safe.from || safe.to) {
    where.date = {};
    if (safe.from) where.date.gte = parseDateOnly(safe.from);
    if (safe.to) where.date.lte = parseDateOnly(safe.to);
  }

  return prisma.attendance.findMany({
    where,
    select: {
      ...ATTENDANCE_FIELDS,
      student: {
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          course: true,
          section: true,
          requiredHours: true,
          completedHours: true,
          company: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: [{ date: 'desc' }],
    take: Math.min(parseInt(safe.limit, 10) || 100, 500)
  });
};
