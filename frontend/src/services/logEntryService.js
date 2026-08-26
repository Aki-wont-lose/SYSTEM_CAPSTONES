import api from './api';

export const getMyLogs = async () => {
  const response = await api.get('/logs/mine');
  return response.data;
};

export const getAllLogs = async (filters = {}) => {
  const response = await api.get('/logs', { params: filters });
  return response.data;
};

export const addLogEntry = async (date, taskDescription) => {
  const response = await api.post('/logs', { date, taskDescription });
  return response.data;
};

export const assignTaskToStudent = async (studentId, date, taskDescription) => {
  const response = await api.post('/logs/assign', { studentId, date, taskDescription });
  return response.data;
};

export const updateLogEntry = async (id, taskDescription) => {
  const response = await api.put(`/logs/${id}`, { taskDescription });
  return response.data;
};

export const reviewLogEntry = async (id, status, comment) => {
  const response = await api.put(`/logs/${id}/review`, { status, comment });
  return response.data;
};

export const deleteLogEntry = async (id) => {
  const response = await api.delete(`/logs/${id}`);
  return response.data;
};
