// modules/profile/controller.js
import { getMyProfile, updateMyProfile, getLinkedAccounts, linkMicrosoftAccount, unlinkMicrosoftAccount } from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchMyProfileUnified = asyncHandler(async (req, res) => {
  const data = await getMyProfile(req.user.userId);
  res.status(200).json({ success: true, data });
});

export const updateMyProfileUnified = asyncHandler(async (req, res) => {
  const updated = await updateMyProfile(req.user.userId, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Student profile not found' });
  res.status(200).json({ success: true, message: 'Profile updated', data: updated });
});

export const fetchLinkedAccounts = asyncHandler(async (req, res) => {
  const data = await getLinkedAccounts(req.user.userId);
  res.status(200).json({ success: true, data });
});

export const linkMicrosoft = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ success: false, message: 'Microsoft ID token is required' });
  const account = await linkMicrosoftAccount(req.user.userId, idToken);
  res.status(201).json({ success: true, message: 'Microsoft account linked', data: account });
});

export const unlinkMicrosoft = asyncHandler(async (req, res) => {
  await unlinkMicrosoftAccount(req.user.userId);
  res.status(200).json({ success: true, message: 'Microsoft account unlinked' });
});
