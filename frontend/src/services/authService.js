import api from './api';

// Direct email + password login — no OTP step.
export const loginRequest = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const forgotPasswordRequest = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordRequest = async (resetToken, newPassword) => {
  const response = await api.post('/auth/reset-password', { resetToken, newPassword });
  return response.data;
};

export const registerRequest = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const validateTokenRequest = async (token) => {
  const response = await api.get('/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const setThemeRequest = async (theme) => {
  const response = await api.post('/auth/theme', { theme });
  return response.data;
};
