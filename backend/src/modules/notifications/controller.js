import * as svc from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchNotifications = asyncHandler(async (req, res) => {
  const data = await svc.getNotifications(req.user.userId);
  res.json({ success: true, data });
});

export const readAll = asyncHandler(async (req, res) => {
  await svc.markAllRead(req.user.userId);
  res.json({ success: true });
});

export const readOne = asyncHandler(async (req, res) => {
  await svc.markRead(req.user.userId, req.params.id);
  res.json({ success: true });
});

export const remove = asyncHandler(async (req, res) => {
  await svc.deleteNotification(req.user.userId, req.params.id);
  res.json({ success: true });
});
