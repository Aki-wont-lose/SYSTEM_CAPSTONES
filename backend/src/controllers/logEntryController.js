// src/controllers/logEntryController.js
import {
  getStudentLogs,
  getAllLogs,
  createLog,
  assignTask,
  submitAssignedTask,
  updateLog,
  reviewLog,
  deleteLog,
  deleteLogAsStaff
} from '../services/logEntryService.js';
import { getStudentByUserId } from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /logs/mine - fetch the signed-in student's own log entries
export const fetchMyLogs = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const logs = await getStudentLogs(student.id);
  res.status(200).json({ success: true, data: logs });
});

// GET /logs - fetch all log entries with optional status/student filters (staff)
export const fetchAllLogs = asyncHandler(async (req, res) => {
  const { status, studentId } = req.query;
  const logs = await getAllLogs({ status, studentId }, req.user);
  res.status(200).json({ success: true, data: logs });
});

// POST /logs - add a daily task log entry
export const addLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { date, taskDescription } = req.body;
  const log = await createLog(student.id, date, taskDescription);
  res.status(201).json({ success: true, message: 'Log entry added', data: log });
});

// POST /logs/assign - assign a task to a student (staff), with an optional attachment
export const addAssignedTask = asyncHandler(async (req, res) => {
  const { studentId, date, taskDescription, assignedFile, assignedFileName } = req.body;
  // Prefer the caller's real name; fall back to their role/email for older sessions.
  const assignedBy = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ').trim()
    || req.user.role
    || req.user.email
    || 'Staff';
  // The target student must be inside the caller's scope; assignTask enforces it.
  const log = await assignTask(studentId, date, taskDescription, assignedBy, req.user, { assignedFile, assignedFileName });
  res.status(201).json({ success: true, message: 'Task assigned', data: log });
});

// POST /logs/:id/submit - student submits their file for an assigned task
export const submitMyTask = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { fileName, fileData } = req.body;
  const log = await submitAssignedTask(req.params.id, student.id, fileName, fileData);
  res.status(200).json({ success: true, message: 'Task submitted for review', data: log });
});

// PUT /logs/:id - edit the student's own log entry
export const editLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const log = await updateLog(req.params.id, student.id, req.body.taskDescription);
  res.status(200).json({ success: true, message: 'Log updated', data: log });
});

// PUT /logs/:id/review - approve or reject a log entry (staff)
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
