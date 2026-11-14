// modules/students/routes.js — ADMIN+COORDINATOR full, SUPERVISOR read-only, STUDENT self only
import express from 'express';
import { fetchAllStudents, fetchStudentById, fetchMyProfile, updateMyProfileSelf, updateMySchedule, fetchMyScheduleLogs, fetchStudentScheduleLogs, addStudent, updateStudentProfile, removeStudent, getDashboardStats, batchCreateStudentsHandler } from '../../controllers/studentController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

// Self (any authenticated user with student record)
router.get('/profile', fetchMyProfile);
router.put('/profile', updateMyProfileSelf);
router.put('/schedule', verifyRole(['STUDENT']), updateMySchedule);
router.get('/schedule/logs', verifyRole(['STUDENT']), fetchMyScheduleLogs);

// ADMIN (including Super Admin) + COORDINATOR + SUPERVISOR can list/view students
router.get('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchAllStudents);
router.get('/stats', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), getDashboardStats);
router.get('/:id', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchStudentById);
router.get('/:id/schedule-logs', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchStudentScheduleLogs);

// ADMIN (including Super Admin) + COORDINATOR can create/update/delete students (SUPERVISOR is view/review only)
router.post('/batch', verifyRole(['ADMIN','COORDINATOR']), batchCreateStudentsHandler);
router.post('/', verifyRole(['ADMIN','COORDINATOR']), addStudent);
router.put('/:id', verifyRole(['ADMIN','COORDINATOR']), updateStudentProfile);
router.delete('/:id', verifyRole(['ADMIN','COORDINATOR']), removeStudent);

export default router;
