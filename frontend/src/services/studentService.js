import api from './api';

// Student's own profile
export const getMyProfile = async () => {
  const response = await api.get('/students/profile');
  return response.data;
};

export const updateMyProfile = async (data) => {
  const response = await api.put('/students/profile', data);
  return response.data;
};

// Admin: manage all students
export const getAllStudents = async (params = {}) => {
  const response = await api.get('/students', { params });
  return response.data;
};

export const getStudentById = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const createStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/students/stats');
  return response.data;
};
