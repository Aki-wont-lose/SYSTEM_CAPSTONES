// src/controllers/attendanceController.js
import {
  getAttendanceHistory,
  recordTimeIn,
  recordTimeOut,
  updateAttendanceRecord,
  getMonthlyAttendance,
  getStudentSummary
} from '../services/attendanceService.js';
import { getStudentByUserId } from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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
  const updateData = req.body;

  const updated = await updateAttendanceRecord(id, updateData);

  res.status(200).json({
    success: true,
    message: 'Attendance record updated',
    data: updated
  });
});

export const fetchStudentAttendanceForStaff = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 30 } = req.query;
  const attendance = await getAttendanceHistory(studentId, parseInt(limit));
  res.status(200).json({ success: true, data: attendance });
});

export const fetchStudentSummaryForStaff = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const summary = await getStudentSummary(studentId);
  res.status(200).json({ success: true, data: summary });
});
