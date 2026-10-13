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
  batchAddStaffAccounts
} from './controller.js';

const router = express.Router();

// Counts stay open to ADMIN + COORDINATOR (the coordinator's screen only shows
// the student total); the staff list itself is ADMIN-only.
router.get('/counts', verifyRole(['ADMIN', 'COORDINATOR']), fetchAccountCounts);
router.get('/', verifyRole(['ADMIN']), fetchStaff);
router.get('/:id', verifyRole(['ADMIN']), fetchAccount);

// Only ADMIN creates/edits/removes coordinator and supervisor accounts
router.post('/', verifyRole(['ADMIN']), addStaffAccount);
router.post('/batch', verifyRole(['ADMIN']), batchAddStaffAccounts);
router.put('/:id', verifyRole(['ADMIN']), editStaffAccount);
router.post('/:id/reset-password', verifyRole(['ADMIN']), regenerateAccountPassword);
router.delete('/:id', verifyRole(['ADMIN']), removeStaffAccount);

export default router;
