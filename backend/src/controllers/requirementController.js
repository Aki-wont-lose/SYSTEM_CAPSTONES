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
  setRequirementCompletion,
  deleteStudentSubmission,
  deleteSubmissionById,
  getGradingSummary,
  getStudentWeeklyTasks,
  completeWeeklyTask
} from '../services/requirementService.js';
import { getStudentByUserId } from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /requirements - fetch requirement definitions with optional filters
export const fetchRequirements = asyncHandler(async (req, res) => {
  const { program, category, cadence } = req.query;
  const requirements = await getAllRequirements({ program, category, cadence });
  res.status(200).json({ success: true, data: requirements });
});

// GET /requirements/my-submissions - fetch the student's own submissions
export const fetchMySubmissions = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

  const data = await getStudentSubmissions(student.id);
  res.status(200).json({ success: true, data });
});

// GET /requirements/submissions/all - fetch all submissions (staff)
export const fetchAllSubmissions = asyncHandler(async (req, res) => {
  const { requirementId, status } = req.query;
  const data = await getAllSubmissions({ requirementId, status }, req.user);
  res.status(200).json({ success: true, data });
});

// GET /requirements/grading - fetch the grading summary (staff)
export const fetchGradingSummary = asyncHandler(async (req, res) => {
  const { course, search, requirementId } = req.query;
  const data = await getGradingSummary({ course, search, requirementId }, req.user);
  res.status(200).json({ success: true, data });
});

// GET /requirements/my-tasks - fetch the student's weekly tasks
export const fetchMyTasks = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const data = await getStudentWeeklyTasks(student.id);
  res.status(200).json({ success: true, data });
});

// PUT /requirements/my-tasks/:id/complete - mark one of the student's weekly tasks complete
export const finishMyTask = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const task = await completeWeeklyTask(req.params.id, student.id);
  res.status(200).json({ success: true, message: 'Task completed', data: task });
});

// POST /requirements - create a requirement definition (admin/coordinator)
export const addRequirement = asyncHandler(async (req, res) => {
  const requirement = await createRequirement(req.body);
  res.status(201).json({ success: true, message: 'Requirement created', data: requirement });
});

// PUT /requirements/:id - update a requirement definition (admin/coordinator)
export const editRequirement = asyncHandler(async (req, res) => {
  const requirement = await updateRequirement(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Requirement updated', data: requirement });
});

// DELETE /requirements/:id - delete a requirement definition (admin/coordinator)
export const removeRequirement = asyncHandler(async (req, res) => {
  await deleteRequirement(req.params.id);
  res.status(200).json({ success: true, message: 'Requirement deleted' });
});

// POST /requirements/:id/submit - submit a file for a requirement
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

// PUT /requirements/checklist/:studentId/:requirementId - tick/untick a requirement (ADMIN+COORDINATOR)
export const toggleRequirementCheck = asyncHandler(async (req, res) => {
  const completed = req.body?.completed === true || req.body?.completed === 'true';
  const data = await setRequirementCompletion(
    req.params.studentId,
    req.params.requirementId,
    completed,
    req.user
  );
  res.status(200).json({ success: true, message: completed ? 'Marked complete' : 'Marked incomplete', data });
});

// PUT /requirements/submissions/:submissionId/review - review a submission with score and remarks (staff)
export const review = asyncHandler(async (req, res) => {
  const { status, remarks, score } = req.body;
  const submission = await reviewSubmission(req.params.submissionId, status, remarks, score, req.user);
  res.status(200).json({ success: true, message: `Submission ${String(status).toLowerCase()}`, data: submission });
});

// DELETE /requirements/:id/submit - remove the signed-in student's submission for a requirement
export const removeMySubmission = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const data = await deleteStudentSubmission(req.params.id, student.id);
  res.status(200).json({ success: true, message: 'Submission removed', data });
});

// DELETE /requirements/submissions/:submissionId - remove a submission record (staff)
export const removeSubmission = asyncHandler(async (req, res) => {
  const data = await deleteSubmissionById(req.params.submissionId, req.user);
  res.status(200).json({ success: true, message: 'Submission removed', data });
});
