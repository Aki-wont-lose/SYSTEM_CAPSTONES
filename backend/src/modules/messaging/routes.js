// modules/messaging/routes.js — Coordinator ↔ Supervisor (+ADMIN) contact
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchContacts, fetchConversation, postMessage, fetchUnread } from './controller.js';

const router = express.Router();

// Only staff can message (STUDENT blocked in service too)
router.get('/contacts', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchContacts);
router.get('/unread', fetchUnread);
router.get('/:userId', fetchConversation);
router.post('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), postMessage);

export default router;
