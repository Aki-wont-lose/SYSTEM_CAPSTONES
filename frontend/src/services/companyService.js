import api from './api';

export const getCompanies = async (search) => {
  const response = await api.get('/companies', { params: { search } });
  return response.data;
};

export const getCompanyById = async (id) => {
  const response = await api.get(`/companies/${id}`);
  return response.data;
};

export const createCompany = async (data) => {
  const response = await api.post('/companies', data);
  return response.data;
};

export const updateCompany = async (id, data) => {
  const response = await api.put(`/companies/${id}`, data);
  return response.data;
};

export const deleteCompany = async (id) => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};

export const assignStudentToCompany = async (companyId, studentId) => {
  const response = await api.post(`/companies/${companyId}/assign`, { studentId });
  return response.data;
};
