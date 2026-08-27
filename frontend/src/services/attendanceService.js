import api from './api';

export const getAttendanceHistory = async (limit = 30) => {
  const response = await api.get('/attendance/history', { params: { limit } });
  return response.data;
};

export const getStudentSummary = async () => {
  const response = await api.get('/attendance/summary');
  return response.data;
};

export const getMonthlyAttendance = async (year, month) => {
  const response = await api.get('/attendance/monthly', { params: { year, month } });
  return response.data;
};

export const timeIn = async (photo) => {
  const response = await api.post('/attendance/time-in', { date: new Date(), photo });
  return response.data;
};

export const timeOut = async (photo) => {
  const response = await api.post('/attendance/time-out', { date: new Date(), photo });
  return response.data;
};

export const getStudentAttendanceForStaff = async (studentId, limit = 30) => {
  const response = await api.get(`/attendance/student/${studentId}/history`, { params: { limit } });
  return response.data;
};

export const getStudentSummaryForStaff = async (studentId) => {
  const response = await api.get(`/attendance/student/${studentId}/summary`);
  return response.data;
};
