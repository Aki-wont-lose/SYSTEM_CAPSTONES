// modules/ojtHours/routes.js - Manage required OJT hours per course & Courses Accepted for Internship
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchOjtHours, setOjtHours, fetchAcceptedCourses, saveAcceptedCourses } from './controller.js';

const router = express.Router();

// Any authenticated user can read the accepted courses list so forms & company views stay in sync
router.get('/accepted-courses', fetchAcceptedCourses);
router.put('/accepted-courses', verifyRole(['ADMIN']), saveAcceptedCourses);

// Coordinators may read the per-course hours (the Add Student form shows them);
// only ADMIN may change them.
router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchOjtHours);
router.put('/:course', verifyRole(['ADMIN']), setOjtHours);

export default router;
