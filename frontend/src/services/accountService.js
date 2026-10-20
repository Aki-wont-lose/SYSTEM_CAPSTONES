// src/services/accountService.js
import api from './api';

// Fetch account totals for the dashboard
export const getAccountCounts = async () => {
  const response = await api.get('/accounts/counts');
  return response.data;
};

// Fetch staff accounts with optional filters
export const getStaffAccounts = async (params = {}) => {
  const response = await api.get('/accounts', { params });
  return response.data;
};

// Create a new staff account
export const createStaffAccount = async (data) => {
  const response = await api.post('/accounts', data);
  return response.data;
};

// Create multiple staff accounts at once
export const batchCreateStaffAccounts = async (accounts) => {
  const response = await api.post('/accounts/batch', { accounts });
  return response.data;
};

// Update a staff account's details
export const updateStaffAccount = async (id, data) => {
  const response = await api.put(`/accounts/${id}`, data);
  return response.data;
};

// Reset a staff account's password and return the new one
export const regenerateAccountPassword = async (id) => {
  const response = await api.post(`/accounts/${id}/reset-password`);
  return response.data;
};

// Delete a staff account
export const deleteStaffAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`);
  return response.data;
};
