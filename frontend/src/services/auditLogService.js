import api from './api';

// Fetch audit log entries with optional filters. The trail is append-only:
// there is deliberately no delete or clear call on the client either.
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};
