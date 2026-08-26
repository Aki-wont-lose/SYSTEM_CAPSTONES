// modules/students/routes.js — ADMIN+COORDINATOR full, SUPERVISOR read-only, STUDENT self only
import express from 'express';
import { fetchAllStudents, fetchStudentById, fetchMyProfile, updateMyProfileSelf, addStudent, updateStudentProfile, removeStudent, getDashboardStats } from '../../controllers/studentController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

// Self (any authenticated user with student record)
router.get('/profile', fetchMyProfile);
router.put('/profile', updateMyProfileSelf);

// ADMIN + COORDINATOR + SUPERVISOR can list/view students
router.get('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchAllStudents);
router.get('/stats', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), getDashboardStats);
router.get('/:id', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchStudentById);

// ADMIN + COORDINATOR can create/update/delete students (SUPERVISOR is view/review only)
router.post('/', verifyRole(['ADMIN','COORDINATOR']), addStudent);
router.put('/:id', verifyRole(['ADMIN','COORDINATOR']), updateStudentProfile);
router.delete('/:id', verifyRole(['ADMIN','COORDINATOR']), removeStudent);

export default router;
