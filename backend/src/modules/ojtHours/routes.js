// modules/ojtHours/routes.js - ADMIN only: manage required OJT hours per course
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchOjtHours, setOjtHours } from './controller.js';

const router = express.Router();

// Coordinators may read the per-course hours (the Add Student form shows them);
// only ADMIN may change them.
router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchOjtHours);
router.put('/:course', verifyRole(['ADMIN']), setOjtHours);

export default router;
