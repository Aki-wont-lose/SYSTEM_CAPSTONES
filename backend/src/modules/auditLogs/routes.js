// modules/auditLogs/routes.js — ADMIN only: the audit trail is administrator-only
// Audit logs are append-only: they can be read but never deleted or purged.
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchAuditLogs } from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN']), fetchAuditLogs);

export default router;
