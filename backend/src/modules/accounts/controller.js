// src/modules/accounts/controller.js
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  getAccountCounts,
  listStaff,
  createStaffAccount,
  updateStaffAccount,
  resetAccountPassword,
  deleteStaffAccount,
  getAccountById,
  batchCreateStaffAccounts
} from './service.js';

// GET /accounts/counts - fetch staff account counts by role
export const fetchAccountCounts = asyncHandler(async (req, res) => {
  const counts = await getAccountCounts(req.user.role);
  res.status(200).json({ success: true, message: 'Account counts retrieved', data: counts });
});

// GET /accounts - list staff accounts with optional filters
export const fetchStaff = asyncHandler(async (req, res) => {
  const { role, search, includeInactive } = req.query;
  const staff = await listStaff({
    role,
    search,
    includeInactive: includeInactive !== 'false',
    requesterRole: req.user.role,
    requesterIsSuperAdmin: !!req.user.isSuperAdmin
  });
  res.status(200).json({ success: true, message: 'Accounts retrieved', data: staff });
});

// GET /accounts/:id - fetch a single staff account
export const fetchAccount = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.params.id);
  res.status(200).json({ success: true, message: 'Account retrieved', data: account });
});

const roleLabel = (role) =>
  role === 'COORDINATOR' ? 'Coordinator' : role === 'ADMIN' ? 'Admin' : 'Supervisor';

// POST /accounts - create a staff account
export const addStaffAccount = asyncHandler(async (req, res) => {
  const result = await createStaffAccount({ ...req.body, requesterIsSuperAdmin: !!req.user.isSuperAdmin });
  res.status(201).json({
    success: true,
    message: `${roleLabel(result.user.role)} account created`,
    data: result
  });
});

// PUT /accounts/:id - update a staff account
export const editStaffAccount = asyncHandler(async (req, res) => {
  const account = await updateStaffAccount(req.params.id, req.body, {
    requesterIsSuperAdmin: !!req.user.isSuperAdmin,
    requesterId: req.user.userId,
    requesterEmail: req.user.email
  });
  res.status(200).json({ success: true, message: 'Account updated', data: account });
});

// POST /accounts/:id/reset-password - generate a new temporary password
export const regenerateAccountPassword = asyncHandler(async (req, res) => {
  const result = await resetAccountPassword(req.params.id, { requesterIsSuperAdmin: !!req.user.isSuperAdmin });
  res.status(200).json({
    success: true,
    message: 'Temporary password generated',
    data: result
  });
});

// DELETE /accounts/:id - remove a staff account
export const removeStaffAccount = asyncHandler(async (req, res) => {
  const result = await deleteStaffAccount(req.params.id, {
    requesterIsSuperAdmin: !!req.user.isSuperAdmin,
    requesterId: req.user.userId,
    requesterEmail: req.user.email
  });
  res.status(200).json({ success: true, message: 'Account removed', data: result });
});

// POST /accounts/batch - create many staff accounts from a batch upload
export const batchAddStaffAccounts = asyncHandler(async (req, res) => {
  const { accounts } = req.body;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    res.status(400).json({ success: false, message: 'No accounts provided' });
    return;
  }
  const results = await batchCreateStaffAccounts(accounts);
  res.status(200).json({ success: true, message: 'Batch upload finished', data: results });
});
