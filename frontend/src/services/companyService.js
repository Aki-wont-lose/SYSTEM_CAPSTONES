import api from './api';

// Fetch companies, accepting a search string or filter object
export const getCompanies = async (filters = {}) => {
  const params = typeof filters === 'string' ? { search: filters } : filters;
  const response = await api.get('/companies', { params });
  return response.data;
};

// Fetch the list of company programs
export const getCompanyPrograms = async () => {
  const response = await api.get('/companies/programs');
  return response.data;
};

// Fetch a single company by id
export const getCompanyById = async (id) => {
  const response = await api.get(`/companies/${id}`);
  return response.data;
};

// Create a new company
export const createCompany = async (data) => {
  const response = await api.post('/companies', data);
  return response.data;
};

// Update a company's details
export const updateCompany = async (id, data) => {
  const response = await api.put(`/companies/${id}`, data);
  return response.data;
};

// Delete a company
export const deleteCompany = async (id) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};

// Assign a student to a company
export const assignStudentToCompany = async (companyId, studentId) => {
  const response = await api.post(`/companies/${companyId}/assign`, { studentId });
  return response.data;
};

// Create multiple companies at once
export const batchCreateCompanies = async (companies) => {
  const response = await api.post('/companies/batch', { companies });
  return response.data;
};
