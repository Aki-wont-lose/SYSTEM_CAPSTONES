import api from './api';

// Fetch the user's message contacts
export const getContacts = async () => {
  const res = await api.get('/messages/contacts');
  return res.data;
};
// Fetch the message thread with another user
export const getConversation = async (userId) => {
  const res = await api.get(`/messages/${userId}`);
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
// Fetch the user's unread messages
export const getUnread = async () => {
  const res = await api.get('/messages/unread');
  return res.data;
};
