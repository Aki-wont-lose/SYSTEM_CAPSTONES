import api from './api';

// Required OJT hours per course (admin-maintained). Coordinators may read the
// list so the Add Student form can show the hours that will be applied.
export const getOjtHours = async () => {
  const response = await api.get('/ojt-hours');
  return response.data;
};

export const updateOjtHours = async (course, requiredHours) => {
  const response = await api.put(`/ojt-hours/${encodeURIComponent(course)}`, { requiredHours });
  return response.data;
};

// Courses Accepted for Internship (admin-maintained, readable by authenticated users)
export const getAcceptedCourses = async () => {
  const response = await api.get('/ojt-hours/accepted-courses');
  return response.data;
};

export const updateAcceptedCourses = async (acceptedCourses) => {
  const response = await api.put('/ojt-hours/accepted-courses', { acceptedCourses });
  return response.data;
};
