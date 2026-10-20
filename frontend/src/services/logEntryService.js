import api from './api';

// Fetch the signed-in student's logbook entries
export const getMyLogs = async () => {
  const response = await api.get('/logs/mine');
  return response.data;
};

// Fetch all log entries with optional filters
export const getAllLogs = async (filters = {}) => {
  const response = await api.get('/logs', { params: filters });
  return response.data;
};

// Add a logbook entry for a date
export const addLogEntry = async (date, taskDescription) => {
  const response = await api.post('/logs', { date, taskDescription });
  return response.data;
};

// Assign a task to a student's logbook
export const assignTaskToStudent = async (studentId, date, taskDescription) => {
  const response = await api.post('/logs/assign', { studentId, date, taskDescription });
  return response.data;
};

// Update a log entry's task description
export const updateLogEntry = async (id, taskDescription) => {
  const response = await api.put(`/logs/${id}`, { taskDescription });
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
