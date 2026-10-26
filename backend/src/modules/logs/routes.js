// modules/logs/routes.js — student logs + DTR unified
// Same UI for all, limited by role: STUDENT owns, COORDINATOR/SUPERVISOR review, ADMIN full
import express from 'express';
import { fetchMyLogs, fetchAllLogs, addLog, addAssignedTask, submitMyTask, editLog, reviewLogEntry, removeLog, removeLogAsStaff } from '../../controllers/logEntryController.js';
import { fetchAttendanceHistory, fetchMonthlyAttendance, fetchStudentSummary, updateAttendance } from '../../controllers/attendanceController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

// Daily task logs
router.get('/mine', fetchMyLogs);
// ADMIN + COORDINATOR + SUPERVISOR can view all logs
router.get('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchAllLogs);
router.post('/', addLog);
// ADMIN + COORDINATOR + SUPERVISOR can assign tasks
router.post('/assign', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), addAssignedTask);
// Student submits their file for an assigned task
router.post('/:id/submit', submitMyTask);
router.put('/:id', editLog);
// ADMIN + COORDINATOR + SUPERVISOR can review
router.put('/:id/review', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), reviewLogEntry);
router.delete('/:id', removeLog);
// ADMIN + COORDINATOR + SUPERVISOR can delete any log entry
router.delete('/:id/staff', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), removeLogAsStaff);

// DTR / attendance — kept under /logs/dtr for organisation but also mounted at /attendance for backward compat.
// Students are read-only; only the supervisor records time in/out (via /attendance/record/*).
router.get('/dtr/history', fetchAttendanceHistory);
router.get('/dtr/summary', fetchStudentSummary);
router.get('/dtr/monthly', fetchMonthlyAttendance);
router.put('/dtr/:id', verifyRole(['ADMIN','SUPERVISOR']), updateAttendance);

export default router;
