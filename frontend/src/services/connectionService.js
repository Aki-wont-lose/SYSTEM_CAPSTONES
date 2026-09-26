import api from './api';

export const getConnections = async () => {
  const response = await api.get('/connections');
  return response.data;
};

export const searchConnectionUsers = async (search) => {
  const response = await api.get('/connections/search', { params: { search } });
  return response.data;
};

export const sendConnectionRequest = async (userId) => {
  const response = await api.post('/connections', { userId });
  return response.data;
};

export const respondToConnection = async (connectionId, action) => {
  const response = await api.put(`/connections/${connectionId}/respond`, { action });
  return response.data;
};

export const removeConnection = async (connectionId) => {
  const response = await api.delete(`/connections/${connectionId}`);
  return response.data;
};
