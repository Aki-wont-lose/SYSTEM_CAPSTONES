import api from './api';

// Archived records stay in the database and can be restored at any time.
export const getArchivedRecords = async () => {
  const response = await api.get('/archive');
  return response.data.data;
};

export const restoreStudent = async (id) => {
  const response = await api.post(`/archive/students/${id}/restore`);
  return response.data;
};

export const restoreStaff = async (id) => {
  const response = await api.post(`/archive/staff/${id}/restore`);
  return response.data;
};

export const restoreCompany = async (id) => {
  const response = await api.post(`/archive/companies/${id}/restore`);
  return response.data;
};
