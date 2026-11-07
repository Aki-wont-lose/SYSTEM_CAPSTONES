// src/modules/accounts/routes.js
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import {
  fetchAccountCounts,
  fetchStaff,
  fetchAccount,
  addStaffAccount,
  editStaffAccount,
  regenerateAccountPassword,
  removeStaffAccount,
  batchAddStaffAccounts,
  reviewSupervisorAccount
} from './controller.js';

const router = express.Router();

// Counts and supervisor request listing are open to ADMIN + COORDINATOR
router.get('/counts', verifyRole(['ADMIN', 'COORDINATOR']), fetchAccountCounts);
router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchStaff);
router.get('/:id', verifyRole(['ADMIN']), fetchAccount);

// ADMIN creates coordinators/admins; COORDINATOR creates OJT Supervisor requests (Pending Approval)
router.post('/', verifyRole(['ADMIN', 'COORDINATOR']), addStaffAccount);
router.post('/batch', verifyRole(['ADMIN', 'COORDINATOR']), batchAddStaffAccounts);
router.post('/:id/review', verifyRole(['ADMIN']), reviewSupervisorAccount);
router.put('/:id', verifyRole(['ADMIN']), editStaffAccount);
router.post('/:id/reset-password', verifyRole(['ADMIN']), regenerateAccountPassword);
router.delete('/:id', verifyRole(['ADMIN']), removeStaffAccount);

export default router;
