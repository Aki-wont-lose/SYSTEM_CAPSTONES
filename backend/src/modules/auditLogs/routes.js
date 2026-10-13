// modules/auditLogs/routes.js — ADMIN only: the audit trail is administrator-only
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchAuditLogs, removeAuditLog, purgeAuditLogs } from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN']), fetchAuditLogs);
router.delete('/', verifyRole(['ADMIN']), purgeAuditLogs);
router.delete('/:id', verifyRole(['ADMIN']), removeAuditLog);

export default router;
