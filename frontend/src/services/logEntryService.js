import api from './api';

// Fetch the signed-in student's logbook entries (Daily Logs & Integration Paper)
export const getMyLogs = async (filters = {}) => {
  const response = await api.get('/logs/mine', { params: filters });
  return response.data;
};

// Fetch all log entries with optional filters
export const getAllLogs = async (filters = {}) => {
  const response = await api.get('/logs', { params: filters });
  return response.data;
};

// Add a logbook entry or Integration Paper
export const addLogEntry = async (date, taskDescription, extra = {}) => {
  const response = await api.post('/logs', { date, taskDescription, ...extra });
  return response.data;
};

// Update a log entry or re-upload Integration Paper
export const updateLogEntry = async (id, taskDescription, extra = {}) => {
  const response = await api.put(`/logs/${id}`, { taskDescription, ...extra });
  return response.data;
};

// Review a log entry with a status and comment
export const reviewLogEntry = async (id, status, comment) => {
  const response = await api.put(`/logs/${id}/review`, { status, comment });
  return response.data;
};

// Delete a log entry
export const deleteLogEntry = async (id) => {
  const response = await api.delete(`/logs/${id}`);
  return response.data;
};

// Delete a log entry as staff
export const deleteLogEntryStaff = async (id) => {
  const response = await api.delete(`/logs/${id}/staff`);
  return response.data;
};
