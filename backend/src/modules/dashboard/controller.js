// modules/dashboard/controller.js
import { getStudentStats } from '../../services/studentService.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { getStudentDashboard as getStudentDashSvc } from './service.js';

export const fetchDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getStudentStats();
  res.status(200).json({ success: true, message: 'Stats retrieved successfully', data: stats });
});

export const fetchMyDashboard = asyncHandler(async (req, res) => {
  const data = await getStudentDashSvc(req.user.userId);
  if (!data) return res.status(404).json({ success: false, message: 'Student profile not found' });
  res.status(200).json({ success: true, data });
});
