// src/routes/studentRoutes.js
import express from 'express';
import {
  fetchAllStudents,
  fetchStudentById,
  fetchMyProfile,
  updateMyProfileSelf,
  addStudent,
  updateStudentProfile,
  removeStudent,
  getDashboardStats
} from '../controllers/studentController.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Self-service routes for authenticated users (own profile only)
router.get('/profile', fetchMyProfile);
router.put('/profile', updateMyProfileSelf);

// Admin routes
router.get('/', verifyRole(['ADMIN']), fetchAllStudents);
router.get('/stats', verifyRole(['ADMIN']), getDashboardStats);
router.get('/:id', verifyRole(['ADMIN']), fetchStudentById);
router.post('/', verifyRole(['ADMIN']), addStudent);
router.put('/:id', verifyRole(['ADMIN']), updateStudentProfile);
router.delete('/:id', verifyRole(['ADMIN']), removeStudent);

export default router;
