// modules/logs/routes.js — student logs + DTR unified
// Same UI for all, limited by role: STUDENT owns, COORDINATOR/SUPERVISOR review, ADMIN full
import express from 'express';
import { fetchMyLogs, fetchAllLogs, addLog, addAssignedTask, editLog, reviewLogEntry, removeLog } from '../../controllers/logEntryController.js';
import { fetchAttendanceHistory, timeIn, timeOut, fetchMonthlyAttendance, fetchStudentSummary, updateAttendance } from '../../controllers/attendanceController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

// Daily task logs
router.get('/mine', fetchMyLogs);
// ADMIN + COORDINATOR + SUPERVISOR can view all logs
router.get('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchAllLogs);
router.post('/', addLog);
// ADMIN + COORDINATOR + SUPERVISOR can assign tasks
router.post('/assign', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), addAssignedTask);
router.put('/:id', editLog);
// ADMIN + COORDINATOR + SUPERVISOR can review
router.put('/:id/review', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), reviewLogEntry);
router.delete('/:id', removeLog);

// DTR / attendance — kept under /logs/dtr for organisation but also mounted at /attendance for backward compat
router.get('/dtr/history', fetchAttendanceHistory);
router.get('/dtr/summary', fetchStudentSummary);
router.get('/dtr/monthly', fetchMonthlyAttendance);
router.post('/dtr/time-in', timeIn);
router.post('/dtr/time-out', timeOut);
router.put('/dtr/:id', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), updateAttendance);

export default router;
