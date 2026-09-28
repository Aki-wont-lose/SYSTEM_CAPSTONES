// src/controllers/attendanceController.js
import { PrismaClient } from '@prisma/client';
import {
  getAttendanceHistory,
  recordTimeIn,
  recordTimeOut,
  updateAttendanceRecord,
  getMonthlyAttendance,
  getStudentSummary,
  submitDtrForReview,
  reviewDtr,
  getDtrReviewQueue
} from '../services/attendanceService.js';
import { getStudentByUserId, getStudentById } from '../services/studentService.js';
import { assertStudentAccess } from '../services/accessScope.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

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

export const timeIn = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  const { date, photo } = req.body;
  const attendance = await recordTimeIn(student.id, date || new Date(), photo);

  res.status(200).json({
    success: true,
    message: 'Time in recorded successfully',
    data: attendance
  });
});

export const timeOut = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  const { date, photo } = req.body;
  const attendance = await recordTimeOut(student.id, date || new Date(), photo);

  res.status(200).json({
    success: true,
    message: 'Time out recorded successfully',
    data: attendance
  });
});

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

export const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Object-level authorization: a caller may only touch a record belonging to a
  // student in their scope. Previously any authenticated user (including a STUDENT)
  // could rewrite anyone's timeIn/timeOut/reviewStatus by changing the id in the URL.
  const student = await getStudentByUserId(req.user.userId);
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

  // A student may only edit their own record, and only while it is still a draft.
  if (req.user.role === 'STUDENT') {
    if (!student || target.student.id !== student.id) {
      return res.status(403).json({ success: false, message: 'You do not have access to this record.' });
    }
    if (target.reviewStatus && target.reviewStatus !== 'DRAFT') {
      return res.status(403).json({ success: false, message: 'This record has already been submitted for review.' });
    }
  } else {
    assertStudentAccess(req.user, target.student, 'You do not have access to this record.');
  }

  const updated = await updateAttendanceRecord(id, req.body);

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

export const fetchStudentAttendanceForStaff = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 30 } = req.query;
  // Scope check: these routes are role-gated, but without this any supervisor could
  // read any student's timeInPhoto/timeOutPhoto by changing studentId in the URL.
  await requireStudentInScope(req.user, studentId);
  const attendance = await getAttendanceHistory(studentId, parseInt(limit));
  res.status(200).json({ success: true, data: attendance });
});

export const fetchStudentSummaryForStaff = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  await requireStudentInScope(req.user, studentId);
  const summary = await getStudentSummary(studentId);
  res.status(200).json({ success: true, data: summary });
});

export const submitForReview = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student profile not found' });
  }

  const record = await submitDtrForReview(req.params.id, student.id);
  res.status(200).json({ success: true, message: 'DTR submitted for approval', data: record });
});

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

export const fetchReviewQueue = asyncHandler(async (req, res) => {
  const { status, course, studentId, from, to, limit } = req.query;
  const data = await getDtrReviewQueue({ status, course, studentId, from, to, limit });
  res.status(200).json({ success: true, data });
});
