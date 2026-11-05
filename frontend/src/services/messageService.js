import api from './api';

// Polling calls use a shorter timeout than the global one so a stalled request
// surfaces as a retryable error instead of an endless spinner.
const POLL_TIMEOUT = 15000;

// Fetch the user's message contacts
export const getContacts = async (config = {}) => {
  const res = await api.get('/messages/contacts', { timeout: POLL_TIMEOUT, ...config });
  return res.data;
};
// Fetch the message thread with another user
export const getConversation = async (userId, config = {}) => {
  const res = await api.get(`/messages/${userId}`, { timeout: POLL_TIMEOUT, ...config });
  return res.data;
};
// Send a message to another user
export const sendMessage = async (receiverId, content) => {
  const res = await api.post('/messages', { receiverId, content });
  return res.data;
};
// Delete a single message
export const deleteMessage = async (messageId) => {
  const res = await api.delete(`/messages/${messageId}`);
  return res.data;
};
// Delete all messages in a conversation with another user
export const deleteConversation = async (userId) => {
  const res = await api.delete(`/messages/conversation/${userId}`);
  return res.data;
};
// Fetch the user's unread messages
export const getUnread = async () => {
  const res = await api.get('/messages/unread');
  return res.data;
};
