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

// Supervisor: record a student's time in. No photo verification any more.
export const recordTimeIn = async ({ studentId, date, timeIn, status, notes }) => {
  const response = await api.post('/attendance/record/time-in', {
    studentId,
    date,
    timeIn,
    status,
    notes
  });
  return response.data;
};

// Supervisor: record a student's time out.
export const recordTimeOut = async ({ studentId, date, timeOut, notes }) => {
  const response = await api.post('/attendance/record/time-out', {
    studentId,
    date,
    timeOut,
    notes
  });
  return response.data;
};

// Supervisor / Admin: correct an existing attendance record
export const updateAttendanceRecord = async (attendanceId, payload) => {
  const response = await api.put(`/attendance/${attendanceId}`, payload);
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

// Scoped attendance list for monitoring screens
export const getAttendanceRecords = async (filters = {}) => {
  const response = await api.get('/attendance/records', { params: filters });
  return response.data;
};

// Fetch the legacy DTRs still waiting for a decision
export const getDtrReviewQueue = async (filters = {}) => {
  const response = await api.get('/attendance/review-queue', { params: filters });
  return response.data;
};

// Approve or reject a legacy submitted DTR with remarks
export const reviewDtr = async (attendanceId, status, remarks) => {
  const response = await api.put(`/attendance/review/${attendanceId}`, { status, remarks });
  return response.data;
};
