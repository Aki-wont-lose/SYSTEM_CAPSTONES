import { PublicClientApplication } from '@azure/msal-browser';
import api from './api';
import { msalConfig, loginRequestScopes, MS_CLIENT_ID } from '../config/msalConfig';

export const isMicrosoftLoginEnabled = !!MS_CLIENT_ID;

let msalInstance = null;
let initPromise = null;

// MSAL requires an explicit async initialize() before use (v3+).
const getMsalInstance = async () => {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  if (!initPromise) {
    initPromise = msalInstance.initialize();
  }
  await initPromise;
  return msalInstance;
};

// Opens the Microsoft account picker popup, returns the ID token on success.
export const signInWithMicrosoftPopup = async () => {
  const instance = await getMsalInstance();
  const result = await instance.loginPopup(loginRequestScopes);
  return result.idToken;
};

// Sends the Microsoft ID token to our backend, which verifies it and
// returns our own SIMES session JWT — no separate OTP step needed since
// Microsoft already verified the password (and any school-enforced MFA).
export const completeMicrosoftLogin = async (idToken) => {
  const response = await api.post('/auth/microsoft', { idToken });
  return response.data;
};

// Account linking: lets a user who signed in with email/password attach a
// Microsoft identity, so "Sign in with Microsoft" reaches the same account.
export const getLinkedAccounts = async () => {
  const response = await api.get('/profile/linked-accounts');
  return response.data;
};

export const linkMicrosoftAccount = async () => {
  const idToken = await signInWithMicrosoftPopup();
  const response = await api.post('/profile/linked-accounts/microsoft', { idToken });
  return response.data;
};

export const unlinkMicrosoftAccount = async () => {
  const response = await api.delete('/profile/linked-accounts/microsoft');
  return response.data;
};
