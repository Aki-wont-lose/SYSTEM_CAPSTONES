import express from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { fetchNotifications, readAll, readOne, remove } from './controller.js';

const router = express.Router();
router.get('/', verifyToken, fetchNotifications);
router.put('/read-all', verifyToken, readAll);
router.put('/:id/read', verifyToken, readOne);
router.delete('/:id', verifyToken, remove);
export default router;
