import api from './api';

// Fetch the signed-in student's recent attendance records
export const getAttendanceHistory = async (limit = 30) => {
  const response = await api.get('/attendance/history', { params: { limit } });
  return response.data;
};

// Fetch the signed-in student's attendance summary
export const getStudentSummary = async () => {
  const response = await api.get('/attendance/summary');
  return response.data;
};

// Fetch the student's attendance for a given month
export const getMonthlyAttendance = async (year, month) => {
  const response = await api.get('/attendance/monthly', { params: { year, month } });
  return response.data;
};

// Log time in with a camera photo
export const timeIn = async (photo) => {
  const response = await api.post('/attendance/time-in', { date: new Date(), photo });
  return response.data;
};

// Log time out with a camera photo
export const timeOut = async (photo) => {
  const response = await api.post('/attendance/time-out', { date: new Date(), photo });
  return response.data;
};

// Fetch a student's attendance history for staff view
export const getStudentAttendanceForStaff = async (studentId, limit = 30) => {
  const response = await api.get(`/attendance/student/${studentId}/history`, { params: { limit } });
  return response.data;
};

// Fetch a student's attendance summary for staff view
export const getStudentSummaryForStaff = async (studentId) => {
  const response = await api.get(`/attendance/student/${studentId}/summary`);
  return response.data;
};

// Submit a daily time record for staff review
export const submitDtrForReview = async (attendanceId) => {
  const response = await api.post(`/attendance/${attendanceId}/submit`);
  return response.data;
};

// Fetch the DTRs waiting for staff review
export const getDtrReviewQueue = async (filters = {}) => {
  const response = await api.get('/attendance/review-queue', { params: filters });
  return response.data;
};

// Approve or reject a DTR with remarks
export const reviewDtr = async (attendanceId, status, remarks) => {
  const response = await api.put(`/attendance/review/${attendanceId}`, { status, remarks });
  return response.data;
};
