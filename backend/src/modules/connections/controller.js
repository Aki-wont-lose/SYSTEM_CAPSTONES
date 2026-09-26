// modules/connections/controller.js
import { getConnections, searchUsers, sendRequest, respondToRequest, removeConnection } from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchConnections = asyncHandler(async (req, res) => {
  const data = await getConnections(req.user.userId);
  res.status(200).json({ success: true, data });
});

export const searchConnections = asyncHandler(async (req, res) => {
  const data = await searchUsers(req.user.userId, req.query.search);
  res.status(200).json({ success: true, data });
});

export const createRequest = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const data = await sendRequest(req.user.userId, userId);
  res.status(201).json({ success: true, message: 'Connection request sent', data });
});

export const answerRequest = asyncHandler(async (req, res) => {
  const { action } = req.body;
  const data = await respondToRequest(req.user.userId, req.params.id, action);
  res.status(200).json({
    success: true,
    message: action === 'ACCEPT' ? 'Connection accepted' : 'Request declined',
    data
  });
});

export const deleteConnection = asyncHandler(async (req, res) => {
  await removeConnection(req.user.userId, req.params.id);
  res.status(200).json({ success: true, message: 'Connection removed' });
});
