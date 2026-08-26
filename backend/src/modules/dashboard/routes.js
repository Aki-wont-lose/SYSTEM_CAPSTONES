// modules/dashboard/routes.js — same dashboard UI, limited by role
import express from 'express';
import { verifyToken, verifyRole } from '../../middleware/auth.js';
import { fetchDashboardStats, fetchMyDashboard } from './controller.js';

const router = express.Router();

// ADMIN + COORDINATOR + SUPERVISOR see full stats, STUDENT sees own
router.get('/stats', verifyToken, verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchDashboardStats);
router.get('/me', verifyToken, verifyRole(['STUDENT']), fetchMyDashboard);

export default router;
