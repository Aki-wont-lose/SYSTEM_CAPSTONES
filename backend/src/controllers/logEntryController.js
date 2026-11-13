// src/controllers/logEntryController.js
import {
  getStudentLogs,
  getAllLogs,
  createLog,
  updateLog,
  reviewLog,
  deleteLog,
  deleteLogAsStaff
} from '../services/logEntryService.js';
import { getStudentByUserId } from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /logs/mine - fetch the signed-in student's own log entries (including Integration Paper)
export const fetchMyLogs = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { logType } = req.query;
  const logs = await getStudentLogs(student.id, { logType });
  res.status(200).json({ success: true, data: logs });
});

// GET /logs - fetch all log entries with optional status/student/logType filters (staff)
export const fetchAllLogs = asyncHandler(async (req, res) => {
  const { status, studentId, logType } = req.query;
  const logs = await getAllLogs({ status, studentId, logType }, req.user);
  res.status(200).json({ success: true, data: logs });
});

// POST /logs - add a daily task log entry or Integration Paper
export const addLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { date, taskDescription, logType, submissionFile, submissionFileName } = req.body;
  const log = await createLog(student.id, date, taskDescription, {
    logType,
    submissionFile,
    submissionFileName,
    userId: req.user.userId,
    userEmail: req.user.email
  });
  res.status(201).json({
    success: true,
    message: log.logType === 'INTEGRATION_PAPER' ? 'Integration Paper submitted' : 'Log entry added',
    data: log
  });
});

// PUT /logs/:id - edit the student's own log entry or re-upload Integration Paper
export const editLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { taskDescription, submissionFile, submissionFileName } = req.body;
  const log = await updateLog(req.params.id, student.id, taskDescription, {
    submissionFile,
    submissionFileName
  });
  res.status(200).json({ success: true, message: 'Log updated', data: log });
});

// PUT /logs/:id/review - approve or request revision on a log entry (staff)
export const reviewLogEntry = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;
  const log = await reviewLog(req.params.id, status, comment, req.user);
  res.status(200).json({ success: true, message: 'Log reviewed', data: log });
});

// DELETE /logs/:id - delete the student's own log entry
export const removeLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  await deleteLog(req.params.id, student.id);
  res.status(200).json({ success: true, message: 'Log deleted' });
});

// DELETE /logs/:id/staff - delete any log entry (staff)
export const removeLogAsStaff = asyncHandler(async (req, res) => {
  await deleteLogAsStaff(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Log deleted' });
});
