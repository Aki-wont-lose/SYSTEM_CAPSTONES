// modules/messaging/controller.js
import * as svc from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

// GET /messaging/contacts - list users the caller can message
export const fetchContacts = asyncHandler(async (req, res) => {
  const users = await svc.getContactUsers(req.user.userId, req.user.role);
  res.json({ success: true, data: users });
});

// GET /messaging/:userId - fetch the conversation with a user and mark it read
export const fetchConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const msgs = await svc.getConversation(req.user.userId, userId);
  await svc.markAsRead(req.user.userId, userId);
  res.json({ success: true, data: msgs });
});

// POST /messaging - send a message to another user
export const postMessage = asyncHandler(async (req, res) => {
  const { receiverId, content } = req.body;
  const msg = await svc.sendMessage(req.user.userId, req.user.role, receiverId, content);
  res.status(201).json({ success: true, data: msg });
});

// DELETE /messaging/conversation/:userId - delete all messages in a conversation
export const removeConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  await svc.deleteConversation(req.user.userId, userId);
  res.json({ success: true, message: 'Conversation deleted' });
});

// DELETE /messaging/:id - delete one of the caller's messages
export const removeMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await svc.deleteMessage(req.user.userId, id);
  res.json({ success: true, message: 'Message deleted' });
});

// GET /messaging/unread - fetch unread message counts per contact
export const fetchUnread = asyncHandler(async (req, res) => {
  const counts = await svc.getUnreadCounts(req.user.userId);
  res.json({ success: true, data: counts });
});
