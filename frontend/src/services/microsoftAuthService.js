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
