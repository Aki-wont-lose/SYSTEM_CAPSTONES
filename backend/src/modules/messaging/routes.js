// modules/messaging/routes.js — all roles can message all
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchContacts, fetchConversation, postMessage, fetchUnread, removeMessage } from './controller.js';

const router = express.Router();

// All authenticated users (ADMIN/COORDINATOR/SUPERVISOR/STUDENT) can list contacts and message
router.get('/contacts', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR','STUDENT']), fetchContacts);
router.get('/unread', fetchUnread);
router.get('/:userId', fetchConversation);
router.post('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR','STUDENT']), postMessage);
router.delete('/:id', removeMessage);

export default router;
