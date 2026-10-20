import api from './api';

// Student's own profile
// Fetch the signed-in student's own profile
export const getMyProfile = async () => {
  const response = await api.get('/students/profile');
  return response.data;
};

// Update the student's own profile
export const updateMyProfile = async (data) => {
  const response = await api.put('/students/profile', data);
  return response.data;
};

// Admin: manage all students
// Fetch all students with optional filters
export const getAllStudents = async (params = {}) => {
  const response = await api.get('/students', { params });
  return response.data;
};

// Fetch a single student by id
export const getStudentById = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

// Create a new student record
export const createStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

// Update a student's details
export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

// Delete a student record
export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

// Create multiple student records at once
export const batchCreateStudents = async (students) => {
  const response = await api.post('/students/batch', { students });
  return response.data;
};

// Fetch dashboard statistics
export const getDashboardStats = async () => {
  const response = await api.get('/students/stats');
  return response.data;
};
