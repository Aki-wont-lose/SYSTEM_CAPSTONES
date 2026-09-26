// src/services/accountService.js
import api from './api';

export const getAccountCounts = async () => {
  const response = await api.get('/accounts/counts');
  return response.data;
};

export const getStaffAccounts = async (params = {}) => {
  const response = await api.get('/accounts', { params });
  return response.data;
};

export const createStaffAccount = async (data) => {
  const response = await api.post('/accounts', data);
  return response.data;
};

export const batchCreateStaffAccounts = async (accounts) => {
  const response = await api.post('/accounts/batch', { accounts });
  return response.data;
};

export const updateStaffAccount = async (id, data) => {
  const response = await api.put(`/accounts/${id}`, data);
  return response.data;
};

export const regenerateAccountPassword = async (id) => {
  const response = await api.post(`/accounts/${id}/reset-password`);
  return response.data;
};

export const deleteStaffAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`);
  return response.data;
};
