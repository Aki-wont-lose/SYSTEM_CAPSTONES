// modules/auditLogs/routes.js — ADMIN and COORDINATOR can read the audit trail
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchAuditLogs } from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchAuditLogs);

export default router;
