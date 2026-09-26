// src/controllers/requirementController.js
import {
  getAllRequirements,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getStudentSubmissions,
  getAllSubmissions,
  submitFile,
  reviewSubmission,
  getGradingSummary,
  getStudentWeeklyTasks,
  completeWeeklyTask
} from '../services/requirementService.js';
import { getStudentByUserId } from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const fetchRequirements = asyncHandler(async (req, res) => {
  const { program, category, cadence } = req.query;
  const requirements = await getAllRequirements({ program, category, cadence });
  res.status(200).json({ success: true, data: requirements });
});

export const fetchMySubmissions = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

  const data = await getStudentSubmissions(student.id);
  res.status(200).json({ success: true, data });
});

export const fetchAllSubmissions = asyncHandler(async (req, res) => {
  const { requirementId, status } = req.query;
  const data = await getAllSubmissions({ requirementId, status });
  res.status(200).json({ success: true, data });
});

export const fetchGradingSummary = asyncHandler(async (req, res) => {
  const { course, search, requirementId } = req.query;
  const data = await getGradingSummary({ course, search, requirementId });
  res.status(200).json({ success: true, data });
});

export const fetchMyTasks = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const data = await getStudentWeeklyTasks(student.id);
  res.status(200).json({ success: true, data });
});

export const finishMyTask = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const task = await completeWeeklyTask(req.params.id, student.id);
  res.status(200).json({ success: true, message: 'Task completed', data: task });
});

export const addRequirement = asyncHandler(async (req, res) => {
  const requirement = await createRequirement(req.body);
  res.status(201).json({ success: true, message: 'Requirement created', data: requirement });
});

export const editRequirement = asyncHandler(async (req, res) => {
  const requirement = await updateRequirement(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Requirement updated', data: requirement });
});

export const removeRequirement = asyncHandler(async (req, res) => {
  await deleteRequirement(req.params.id);
  res.status(200).json({ success: true, message: 'Requirement deleted' });
});

export const upload = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

  const { fileName, fileData } = req.body;
  const submission = await submitFile(req.params.id, student.id, fileName, fileData);
  res.status(201).json({
    success: true,
    message: submission.autoScoreAwarded
      ? `File submitted — ${submission.autoScoreAwarded} point(s) awarded automatically`
      : 'File submitted',
    data: submission
  });
});

export const review = asyncHandler(async (req, res) => {
  const { status, remarks, score } = req.body;
  const submission = await reviewSubmission(req.params.submissionId, status, remarks, score);
  res.status(200).json({ success: true, message: `Submission ${String(status).toLowerCase()}`, data: submission });
});
