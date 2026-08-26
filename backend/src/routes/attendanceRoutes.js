// src/routes/attendanceRoutes.js
import express from 'express';
import {
  fetchAttendanceHistory,
  timeIn,
  timeOut,
  fetchMonthlyAttendance,
  fetchStudentSummary,
  updateAttendance
} from '../controllers/attendanceController.js';

const router = express.Router();

router.get('/history', fetchAttendanceHistory);
router.get('/summary', fetchStudentSummary);
router.get('/monthly', fetchMonthlyAttendance);
router.post('/time-in', timeIn);
router.post('/time-out', timeOut);
router.put('/:id', updateAttendance);

export default router;
