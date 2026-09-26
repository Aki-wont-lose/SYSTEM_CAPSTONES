// modules/auditLogs/routes.js — ADMIN and COORDINATOR can read the audit trail
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchAuditLogs, removeAuditLog, purgeAuditLogs } from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchAuditLogs);
router.delete('/', verifyRole(['ADMIN']), purgeAuditLogs);
router.delete('/:id', verifyRole(['ADMIN']), removeAuditLog);

export default router;
