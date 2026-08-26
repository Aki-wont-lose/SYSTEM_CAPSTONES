// modules/messaging/controller.js
import * as svc from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchContacts = asyncHandler(async (req, res) => {
  const users = await svc.getContactUsers(req.user.userId, req.user.role);
  res.json({ success: true, data: users });
});

export const fetchConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const msgs = await svc.getConversation(req.user.userId, userId);
  await svc.markAsRead(req.user.userId, userId);
  res.json({ success: true, data: msgs });
});

export const postMessage = asyncHandler(async (req, res) => {
  const { receiverId, content } = req.body;
  const msg = await svc.sendMessage(req.user.userId, req.user.role, receiverId, content);
  res.status(201).json({ success: true, data: msg });
});

export const fetchUnread = asyncHandler(async (req, res) => {
  const counts = await svc.getUnreadCounts(req.user.userId);
  res.json({ success: true, data: counts });
});
