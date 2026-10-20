import * as svc from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

// GET /notifications - fetch the signed-in user's notifications
export const fetchNotifications = asyncHandler(async (req, res) => {
  const data = await svc.getNotifications(req.user.userId);
  res.json({ success: true, data });
});

// PUT /notifications/read-all - mark all of the user's notifications as read
export const readAll = asyncHandler(async (req, res) => {
  await svc.markAllRead(req.user.userId);
  res.json({ success: true });
});

// PUT /notifications/:id/read - mark one notification as read
export const readOne = asyncHandler(async (req, res) => {
  await svc.markRead(req.user.userId, req.params.id);
  res.json({ success: true });
});

// DELETE /notifications/:id - delete one of the user's notifications
export const remove = asyncHandler(async (req, res) => {
  await svc.deleteNotification(req.user.userId, req.params.id);
  res.json({ success: true });
});
