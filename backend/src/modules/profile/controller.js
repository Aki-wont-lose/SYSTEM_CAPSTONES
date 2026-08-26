// modules/profile/controller.js
import { getMyProfile, updateMyProfile } from './service.js';
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
