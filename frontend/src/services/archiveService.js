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

export const restoreCoordinator = async (id) => {
  const response = await api.post(`/archive/coordinators/${id}/restore`);
  return response.data;
};

export const restoreSupervisor = async (id) => {
  const response = await api.post(`/archive/supervisors/${id}/restore`);
  return response.data;
};

export const restoreCompany = async (id) => {
  const response = await api.post(`/archive/companies/${id}/restore`);
  return response.data;
};

// Permanent deletion (admin only). The API refuses records that are not archived.
export const deleteStudentPermanently = async (id) => {
  const response = await api.delete(`/archive/students/${id}`);
  return response.data;
};

export const deleteCoordinatorPermanently = async (id) => {
  const response = await api.delete(`/archive/coordinators/${id}`);
  return response.data;
};

export const deleteSupervisorPermanently = async (id) => {
  const response = await api.delete(`/archive/supervisors/${id}`);
  return response.data;
};

export const deleteCompanyPermanently = async (id) => {
  const response = await api.delete(`/archive/companies/${id}`);
  return response.data;
};
