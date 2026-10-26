// src/controllers/attendanceController.js
import { PrismaClient } from '@prisma/client';
import {
  getAttendanceHistory,
  recordTimeInForStudent,
  recordTimeOutForStudent,
  updateAttendanceRecord,
  getMonthlyAttendance,
  getStudentSummary,
  reviewDtr,
  getDtrReviewQueue,
  getAttendanceRecords
} from '../services/attendanceService.js';
import { getStudentByUserId, getStudentById } from '../services/studentService.js';
import { assertStudentAccess } from '../services/accessScope.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

// GET /attendance/history - fetch the signed-in student's attendance history
export const fetchAttendanceHistory = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  const { limit = 30 } = req.query;
  const attendance = await getAttendanceHistory(student.id, parseInt(limit));

  res.status(200).json({
    success: true,
    message: 'Attendance history retrieved',
    data: attendance
  });
});

// POST /attendance/record/time-in - the assigned supervisor records a time in.
// The student is chosen by id, so the object-level scope check below decides
// whether this supervisor may touch that student at all.
export const recordAttendanceTimeIn = asyncHandler(async (req, res) => {
  const { studentId, date, timeIn, status, notes } = req.body || {};

  if (!studentId) {
    return res.status(400).json({ success: false, message: 'A student must be selected.' });
  }

  const student = await requireStudentInScope(req.user, studentId);
  const attendance = await recordTimeInForStudent(student, { date, timeIn, status, notes }, req.user);

  res.status(201).json({
    success: true,
    message: 'Time in recorded successfully',
    data: attendance
  });
});

// POST /attendance/record/time-out - the assigned supervisor records a time out
export const recordAttendanceTimeOut = asyncHandler(async (req, res) => {
  const { studentId, date, timeOut, notes } = req.body || {};

  if (!studentId) {
    return res.status(400).json({ success: false, message: 'A student must be selected.' });
  }

  const student = await requireStudentInScope(req.user, studentId);
  const attendance = await recordTimeOutForStudent(student, { date, timeOut, notes }, req.user);

  res.status(200).json({
    success: true,
    message: 'Time out recorded successfully',
    data: attendance
  });
});

// GET /attendance/monthly - fetch a student's attendance for a given month
export const fetchMonthlyAttendance = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  const { year, month } = req.query;
  
  if (!year || !month) {
    return res.status(400).json({
      success: false,
      message: 'Year and month are required'
    });
  }

  const attendance = await getMonthlyAttendance(student.id, parseInt(year), parseInt(month));

  res.status(200).json({
    success: true,
    message: 'Monthly attendance retrieved',
    data: attendance
  });
});

// GET /attendance/summary - fetch the student's attendance summary
export const fetchStudentSummary = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  const summary = await getStudentSummary(student.id);

  res.status(200).json({
    success: true,
    message: 'Student summary retrieved',
    data: summary
  });
});

// PUT /attendance/:id - correct an attendance record (Supervisor only)
export const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Object-level authorization: a caller may only touch a record belonging to a
  // student in their scope. Students have no write path at all.
  const target = await prisma.attendance.findUnique({
    where: { id },
    select: {
      reviewStatus: true,
      student: { select: { id: true, course: true, companyId: true, supervisorEmail: true } }
    }
  });

  if (!target) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  assertStudentAccess(req.user, target.student, 'You do not have access to this record.');

  // req.user is passed as the actor so the correction is stamped (last modified
  // by) and recorded in the audit log.
  const updated = await updateAttendanceRecord(id, req.body, req.user);

  res.status(200).json({
    success: true,
    message: 'Attendance record updated',
    data: updated
  });
});

// Shared guard for the staff-only attendance endpoints. Returns the student row
// when the caller is allowed to see it, otherwise throws a 403 via asyncHandler.
const requireStudentInScope = async (user, studentId) => {
  const student = await getStudentById(studentId);
  if (!student) {
    const notFound = new Error('Student not found');
    notFound.status = 404;
    throw notFound;
  }
  assertStudentAccess(user, student);
  return student;
};

// GET /attendance/student/:studentId/history - fetch a student's attendance for staff
export const fetchStudentAttendanceForStaff = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 30 } = req.query;
  // Scope check: these routes are role-gated, but without this any supervisor could
  // read or record attendance for any student by changing studentId in the URL.
  await requireStudentInScope(req.user, studentId);
  const attendance = await getAttendanceHistory(studentId, parseInt(limit));
  res.status(200).json({ success: true, data: attendance });
});

// GET /attendance/student/:studentId/summary - fetch a student's attendance summary for staff
export const fetchStudentSummaryForStaff = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  await requireStudentInScope(req.user, studentId);
  const summary = await getStudentSummary(studentId);
  res.status(200).json({ success: true, data: summary });
});

// POST /attendance/:id/submit - submit a finished DTR for supervisor approval
// Removed: attendance is now recorded by the supervisor, so there is nothing for
// a student to submit. The route is gone as well.

// PUT /attendance/review/:id - approve or reject a legacy submitted DTR
export const reviewDtrRecord = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  // Scope check before approving/rejecting: without this any supervisor could act
  // on any student's DTR in the institution.
  const record = await prisma.attendance.findUnique({
    where: { id: req.params.id },
    select: { student: { select: { id: true, course: true, companyId: true, supervisorEmail: true } } }
  });
  if (!record) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }
  assertStudentAccess(req.user, record.student);

  const updated = await reviewDtr(req.params.id, req.user, status, remarks);
  res.status(200).json({
    success: true,
    message: status === 'APPROVED' ? 'DTR approved' : 'DTR rejected',
    data: updated
  });
});

// GET /attendance/review-queue - fetch the DTR review queue with filters
export const fetchReviewQueue = asyncHandler(async (req, res) => {
  const { status, course, studentId, from, to, limit } = req.query;
  const data = await getDtrReviewQueue({ status, course, studentId, from, to, limit }, req.user);
  res.status(200).json({ success: true, data });
});

// GET /attendance/records - scoped attendance list for monitoring screens
export const fetchAttendanceRecords = asyncHandler(async (req, res) => {
  const { studentId, status, reviewStatus, course, incomplete, from, to, limit } = req.query;
  const data = await getAttendanceRecords(
    { studentId, status, reviewStatus, course, incomplete, from, to, limit },
    req.user
  );
  res.status(200).json({ success: true, data });
});
