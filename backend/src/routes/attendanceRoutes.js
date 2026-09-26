// src/routes/attendanceRoutes.js
import express from 'express';
import {
  fetchAttendanceHistory,
  timeIn,
  timeOut,
  fetchMonthlyAttendance,
  fetchStudentSummary,
  updateAttendance,
  fetchStudentAttendanceForStaff,
  fetchStudentSummaryForStaff,
  submitForReview,
  reviewDtrRecord,
  fetchReviewQueue
} from '../controllers/attendanceController.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/history', fetchAttendanceHistory);
router.get('/summary', fetchStudentSummary);
router.get('/monthly', fetchMonthlyAttendance);
router.post('/time-in', timeIn);
router.post('/time-out', timeOut);
router.put('/:id', updateAttendance);

// Student locks a finished day and sends it to the supervisor for approval
router.post('/:id/submit', submitForReview);

// Staff can view any student's DTR for monitoring (supervisor = company needs to see time in/out)
router.get('/student/:studentId/history', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchStudentAttendanceForStaff);
router.get('/student/:studentId/summary', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchStudentSummaryForStaff);

// DTR approval queue and decisions
router.get('/review-queue', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchReviewQueue);
router.put('/review/:id', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), reviewDtrRecord);

export default router;
