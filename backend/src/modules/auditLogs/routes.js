// modules/auditLogs/routes.js — ADMIN only: the audit trail is administrator-only
import express from 'express';
import { verifyRole, verifySuperAdmin } from '../../middleware/auth.js';
import { fetchAuditLogs, removeAuditLog, purgeAuditLogs } from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN']), fetchAuditLogs);
// Purging the entire audit trail is a super-admin-only action.
router.delete('/', verifyRole(['ADMIN']), verifySuperAdmin, purgeAuditLogs);
router.delete('/:id', verifyRole(['ADMIN']), removeAuditLog);

export default router;
