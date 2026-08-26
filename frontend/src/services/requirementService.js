import api from './api';

export const getRequirements = async () => {
  const response = await api.get('/requirements');
  return response.data;
};

export const getMySubmissions = async () => {
  const response = await api.get('/requirements/my-submissions');
  return response.data;
};

export const getAllSubmissions = async (filters = {}) => {
  const response = await api.get('/requirements/submissions/all', { params: filters });
  return response.data;
};

export const createRequirement = async (data) => {
  const response = await api.post('/requirements', data);
  return response.data;
};

export const updateRequirement = async (id, data) => {
  const response = await api.put(`/requirements/${id}`, data);
  return response.data;
};

export const deleteRequirement = async (id) => {
  const response = await api.delete(`/requirements/${id}`);
  return response.data;
};

export const submitRequirementFile = async (requirementId, fileName, fileData) => {
  const response = await api.post(`/requirements/${requirementId}/submit`, { fileName, fileData });
  return response.data;
};

export const reviewSubmission = async (submissionId, status, remarks) => {
  const response = await api.put(`/requirements/submissions/${submissionId}/review`, { status, remarks });
  return response.data;
};
