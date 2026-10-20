import api from './api';

// Fetch audit log entries with optional filters
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

// Delete a single audit log entry
export const deleteAuditLog = async (id) => {
  const response = await api.delete(`/audit-logs/${id}`);
  return response.data;
};

// Delete all audit log entries
export const clearAuditLogs = async () => {
  const response = await api.delete('/audit-logs');
  return response.data;
};
