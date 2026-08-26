// src/controllers/logEntryController.js
import {
  getStudentLogs,
  getAllLogs,
  createLog,
  assignTask,
  updateLog,
  reviewLog,
  deleteLog
} from '../services/logEntryService.js';
import { getStudentByUserId } from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const fetchMyLogs = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const logs = await getStudentLogs(student.id);
  res.status(200).json({ success: true, data: logs });
});

export const fetchAllLogs = asyncHandler(async (req, res) => {
  const { status, studentId } = req.query;
  const logs = await getAllLogs({ status, studentId });
  res.status(200).json({ success: true, data: logs });
});

export const addLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { date, taskDescription } = req.body;
  const log = await createLog(student.id, date, taskDescription);
  res.status(201).json({ success: true, message: 'Log entry added', data: log });
});

export const addAssignedTask = asyncHandler(async (req, res) => {
  const { studentId, date, taskDescription } = req.body;
  const log = await assignTask(studentId, date, taskDescription, 'Admin');
  res.status(201).json({ success: true, message: 'Task assigned', data: log });
});

export const editLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const log = await updateLog(req.params.id, student.id, req.body.taskDescription);
  res.status(200).json({ success: true, message: 'Log updated', data: log });
});

export const reviewLogEntry = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;
  const log = await reviewLog(req.params.id, status, comment);
  res.status(200).json({ success: true, message: 'Log reviewed', data: log });
});

export const removeLog = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  await deleteLog(req.params.id, student.id);
  res.status(200).json({ success: true, message: 'Log deleted' });
});
