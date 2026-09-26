// src/modules/accounts/controller.js
import { asyncHandler } from '../../middleware/errorHandler.js';
import {
  getAccountCounts,
  listStaff,
  createStaffAccount,
  updateStaffAccount,
  resetAccountPassword,
  deleteStaffAccount,
  getAccountById
} from './service.js';

export const fetchAccountCounts = asyncHandler(async (req, res) => {
  const counts = await getAccountCounts();
  res.status(200).json({ success: true, message: 'Account counts retrieved', data: counts });
});

export const fetchStaff = asyncHandler(async (req, res) => {
  const { role, search, includeInactive } = req.query;
  const staff = await listStaff({
    role,
    search,
    includeInactive: includeInactive !== 'false'
  });
  res.status(200).json({ success: true, message: 'Accounts retrieved', data: staff });
});

export const fetchAccount = asyncHandler(async (req, res) => {
  const account = await getAccountById(req.params.id);
  res.status(200).json({ success: true, message: 'Account retrieved', data: account });
});

export const addStaffAccount = asyncHandler(async (req, res) => {
  const result = await createStaffAccount(req.body);
  res.status(201).json({
    success: true,
    message: `${result.user.role === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'} account created`,
    data: result
  });
});

export const editStaffAccount = asyncHandler(async (req, res) => {
  const account = await updateStaffAccount(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Account updated', data: account });
});

export const regenerateAccountPassword = asyncHandler(async (req, res) => {
  const result = await resetAccountPassword(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Temporary password generated',
    data: result
  });
});

export const removeStaffAccount = asyncHandler(async (req, res) => {
  const result = await deleteStaffAccount(req.params.id);
  res.status(200).json({ success: true, message: 'Account removed', data: result });
});
