// src/routes/attendanceRoutes.js
//
// Attendance is recorded by the assigned Company Supervisor, monitored by the
// Coordinator and Admin, and read-only for the Student. There is no student
// write path of any kind: no time in, no time out, no submit, no edit.
import express from 'express';
import {
  fetchAttendanceHistory,
  recordAttendanceTimeIn,
  recordAttendanceTimeOut,
  fetchMonthlyAttendance,
  fetchStudentSummary,
  updateAttendance,
  fetchStudentAttendanceForStaff,
  fetchStudentSummaryForStaff,
  reviewDtrRecord,
  fetchReviewQueue,
  fetchAttendanceRecords
} from '../controllers/attendanceController.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Student: read-only view of their own records.
router.get('/history', fetchAttendanceHistory);
router.get('/summary', fetchStudentSummary);
router.get('/monthly', fetchMonthlyAttendance);

// Supervisor: record attendance for a student. The controller additionally
// checks that the caller may access that specific student, so a supervisor can
// never touch another company's student. Admin is audit-only: it may review and
// correct records, but it does not create time entries.
router.post('/record/time-in', verifyRole(['SUPERVISOR']), recordAttendanceTimeIn);
router.post('/record/time-out', verifyRole(['SUPERVISOR']), recordAttendanceTimeOut);

// Corrections: Admin and Supervisor only, always stamped and audited.
router.put('/:id', verifyRole(['ADMIN', 'SUPERVISOR']), updateAttendance);

// Staff monitoring: Admin (institution-wide), Coordinator (own program),
// Supervisor (own company). Scope is enforced per record in the service.
router.get('/records', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), fetchAttendanceRecords);
router.get('/student/:studentId/history', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), fetchStudentAttendanceForStaff);
router.get('/student/:studentId/summary', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), fetchStudentSummaryForStaff);

// Legacy review queue: only rows still in SUBMITTED (from the old student-submit
// workflow) can be decided, and only by a Supervisor or Admin.
router.get('/review-queue', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), fetchReviewQueue);
router.put('/review/:id', verifyRole(['SUPERVISOR', 'ADMIN']), reviewDtrRecord);

export default router;
