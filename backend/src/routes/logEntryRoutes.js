// src/routes/logEntryRoutes.js
import express from 'express';
import {
  fetchMyLogs,
  fetchAllLogs,
  addLog,
  addAssignedTask,
  editLog,
  reviewLogEntry,
  removeLog
} from '../controllers/logEntryController.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/mine', fetchMyLogs);
router.get('/', verifyRole(['ADMIN']), fetchAllLogs);
router.post('/', addLog);
router.post('/assign', verifyRole(['ADMIN']), addAssignedTask);
router.put('/:id', editLog);
router.put('/:id/review', verifyRole(['ADMIN']), reviewLogEntry);
router.delete('/:id', removeLog);

export default router;
