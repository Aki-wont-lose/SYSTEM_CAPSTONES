// modules/ojtHours/controller.js
import * as svc from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

// GET /ojt-hours - list required OJT hours per course
export const fetchOjtHours = asyncHandler(async (req, res) => {
  const data = await svc.getOjtHours();
  res.status(200).json({ success: true, data });
});

// PUT /ojt-hours/:course - set required OJT hours for a course (ADMIN only)
export const setOjtHours = asyncHandler(async (req, res) => {
  const { course } = req.params;
  const { requiredHours } = req.body;
  const data = await svc.updateOjtHours(course, requiredHours);
  res.status(200).json({ success: true, data });
});

// GET /ojt-hours/accepted-courses - list courses officially accepted for internship
export const fetchAcceptedCourses = asyncHandler(async (req, res) => {
  const data = await svc.getAcceptedInternshipCourses();
  res.status(200).json({ success: true, data });
});

// PUT /ojt-hours/accepted-courses - update courses officially accepted for internship (ADMIN only)
export const saveAcceptedCourses = asyncHandler(async (req, res) => {
  const { acceptedCourses } = req.body;
  const data = await svc.updateAcceptedInternshipCourses(acceptedCourses, req.user);
  res.status(200).json({ success: true, data });
});
