import api from './api';

// Fetch requirements with optional filters
export const getRequirements = async (params = {}) => {
  const response = await api.get('/requirements', { params });
  return response.data;
};

// Fetch the signed-in student's requirement submissions
export const getMySubmissions = async () => {
  const response = await api.get('/requirements/my-submissions');
  return response.data;
};

// Fetch the signed-in student's weekly tasks
export const getMyWeeklyTasks = async () => {
  const response = await api.get('/requirements/my-tasks');
  return response.data;
};

// Mark a weekly task as complete
export const completeWeeklyTask = async (taskId) => {
  const response = await api.put(`/requirements/my-tasks/${taskId}/complete`);
  return response.data;
};

// Fetch all submissions for staff review
export const getAllSubmissions = async (filters = {}) => {
  const response = await api.get('/requirements/submissions/all', { params: filters });
  return response.data;
};

// Fetch grading summary stats
export const getGradingSummary = async (filters = {}) => {
  const response = await api.get('/requirements/grading', { params: filters });
  return response.data;
};

// Create a new requirement
export const createRequirement = async (data) => {
  const response = await api.post('/requirements', data);
  return response.data;
};

// Update a requirement
export const updateRequirement = async (id, data) => {
  const response = await api.put(`/requirements/${id}`, data);
  return response.data;
};

// Delete a requirement
export const deleteRequirement = async (id) => {
  const response = await api.delete(`/requirements/${id}`);
  return response.data;
};

// Submit a file for a requirement
export const submitRequirementFile = async (requirementId, fileName, fileData) => {
  const response = await api.post(`/requirements/${requirementId}/submit`, { fileName, fileData });
  return response.data;
};

// Review a submission with status, remarks, and score
export const reviewSubmission = async (submissionId, status, remarks, score) => {
  const response = await api.put(`/requirements/submissions/${submissionId}/review`, { status, remarks, score });
  return response.data;
};
