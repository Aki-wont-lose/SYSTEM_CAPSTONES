// modules/ojtHours/routes.js - Manage required OJT hours per course & Courses Accepted for Internship
import express from 'express';
import { verifyRole, denySuperAdmin } from '../../middleware/auth.js';
import { fetchOjtHours, setOjtHours, fetchAcceptedCourses, saveAcceptedCourses } from './controller.js';

const router = express.Router();

// Any authenticated user can read the accepted courses list so forms & company views stay in sync;
// both Super Admin and Admin can update the accepted courses list in Partner Companies.
router.get('/accepted-courses', fetchAcceptedCourses);
router.put('/accepted-courses', verifyRole(['ADMIN']), saveAcceptedCourses);

// Coordinators may read the per-course hours (the Add Student form shows them);
// only ADMIN (not Super Admin) may change them.
router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, fetchOjtHours);
router.put('/:course', verifyRole(['ADMIN']), denySuperAdmin, setOjtHours);

export default router;
