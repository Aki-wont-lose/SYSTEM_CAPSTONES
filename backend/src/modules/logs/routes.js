// modules/logs/routes.js — student logs + Integration Paper + DTR unified
// Same UI for all, limited by role: STUDENT owns, COORDINATOR/SUPERVISOR review, ADMIN full (Super Admin excluded)
import express from 'express';
import { fetchMyLogs, fetchAllLogs, addLog, editLog, reviewLogEntry, removeLog, removeLogAsStaff } from '../../controllers/logEntryController.js';
import { fetchAttendanceHistory, fetchMonthlyAttendance, fetchStudentSummary, updateAttendance } from '../../controllers/attendanceController.js';
import { verifyRole, denySuperAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Daily task logs & Integration Paper
router.get('/mine', verifyRole(['STUDENT']), fetchMyLogs);
router.get('/', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), denySuperAdmin, fetchAllLogs);
router.post('/', verifyRole(['STUDENT']), addLog);
router.put('/:id', verifyRole(['STUDENT']), editLog);
router.put('/:id/review', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), denySuperAdmin, reviewLogEntry);
router.delete('/:id', verifyRole(['STUDENT']), removeLog);
router.delete('/:id/staff', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), denySuperAdmin, removeLogAsStaff);

// DTR / attendance — kept under /logs/dtr for organisation
router.get('/dtr/history', denySuperAdmin, fetchAttendanceHistory);
router.get('/dtr/summary', denySuperAdmin, fetchStudentSummary);
router.get('/dtr/monthly', denySuperAdmin, fetchMonthlyAttendance);
router.put('/dtr/:id', verifyRole(['SUPERVISOR']), updateAttendance);

export default router;
