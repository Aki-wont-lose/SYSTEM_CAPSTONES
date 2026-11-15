// modules/messaging/routes.js — all roles can message all
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import { fetchContacts, fetchConversation, postMessage, fetchUnread, editMessage, removeMessage, removeConversation } from './controller.js';

const router = express.Router();

// All authenticated users (ADMIN/COORDINATOR/SUPERVISOR/STUDENT) can list contacts and message
router.get('/contacts', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR','STUDENT']), fetchContacts);
router.get('/unread', fetchUnread);
router.get('/:userId', fetchConversation);
router.post('/', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR','STUDENT']), postMessage);
router.put('/:id', editMessage);
router.patch('/:id', editMessage);
router.delete('/conversation/:userId', removeConversation);
router.delete('/:id', removeMessage);

export default router;
