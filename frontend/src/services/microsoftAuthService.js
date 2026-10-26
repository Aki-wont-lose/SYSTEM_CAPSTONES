import { PublicClientApplication } from '@azure/msal-browser';
import api from './api';
import { msalConfig, loginRequestScopes, MS_CLIENT_ID } from '../config/msalConfig';

export const isMicrosoftLoginEnabled = !!MS_CLIENT_ID;

let msalInstance = null;
let initPromise = null;
let pendingPopup = null;

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

// MSAL v3 stores the "a popup is already open" flag in a single key that is NOT
// prefixed with the client id: `msal.interaction.status` (its value is the client
// id). The per-request state it writes alongside uses `msal.<clientId>.request.*`.
const INTERACTION_STATUS_KEY = 'msal.interaction.status';

// An abandoned popup (closed early, page reloaded while it was open, duplicated
// tab) leaves that flag behind, and every later sign-in then fails with
// interaction_in_progress. Clearing the flag and the stale request state fixes it
// without signing the user out of their Microsoft account.
const clearStaleInteraction = () => {
  const status = sessionStorage.getItem(INTERACTION_STATUS_KEY);
  // Only touch a flag that belongs to this app, never another client's.
  if (!status || status === MS_CLIENT_ID) {
    sessionStorage.removeItem(INTERACTION_STATUS_KEY);
  }

  const prefix = `msal.${MS_CLIENT_ID}.`;
  const stale = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    if (key.includes('request.') || key.includes('interaction.status')) stale.push(key);
  }
  stale.forEach((key) => sessionStorage.removeItem(key));
};

const decorateError = (err) => {
  const code = err?.errorCode || err?.subError;
  if (code === 'interaction_in_progress') {
    err.message = 'Microsoft sign-in is already open. Close the Microsoft window, then try again.';
  } else if (code && !String(err.message || '').includes(code)) {
    err.message = `${err.message || 'Microsoft sign-in failed'} (${code})`;
  }
  return err;
};

// Opens the Microsoft account picker popup, returns the ID token on success.
// Concurrent calls share one popup instead of starting a second interaction.
export const signInWithMicrosoftPopup = async () => {
  if (pendingPopup) return pendingPopup;

  pendingPopup = (async () => {
    const instance = await getMsalInstance();
    // Nothing is pending in this page (the guard above returned otherwise), so any
    // flag still in storage is left over from an earlier abandoned popup.
    clearStaleInteraction();
    try {
      const result = await instance.loginPopup(loginRequestScopes);
      return result.idToken;
    } catch (err) {
      // Retry once in case the flag was written by a concurrent attempt.
      if (err?.errorCode === 'interaction_in_progress') {
        clearStaleInteraction();
        try {
          const result = await instance.loginPopup(loginRequestScopes);
          return result.idToken;
        } catch (retryErr) {
          throw decorateError(retryErr);
        }
      }
      throw decorateError(err);
    }
  })();

  try {
    return await pendingPopup;
  } finally {
    pendingPopup = null;
  }
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
