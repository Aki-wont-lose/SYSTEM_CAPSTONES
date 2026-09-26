import api from './api';

export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

export const deleteAuditLog = async (id) => {
  const response = await api.delete(`/audit-logs/${id}`);
  return response.data;
};

export const clearAuditLogs = async () => {
  const response = await api.delete('/audit-logs');
  return response.data;
};
