import api from './api';

export const getContacts = async () => {
  const res = await api.get('/messages/contacts');
  return res.data;
};
export const getConversation = async (userId) => {
  const res = await api.get(`/messages/${userId}`);
  return res.data;
};
export const sendMessage = async (receiverId, content) => {
  const res = await api.post('/messages', { receiverId, content });
  return res.data;
};
export const getUnread = async () => {
  const res = await api.get('/messages/unread');
  return res.data;
};
