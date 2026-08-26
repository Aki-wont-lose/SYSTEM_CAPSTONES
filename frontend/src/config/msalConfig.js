// src/config/msalConfig.js
//
// MSAL (Microsoft Authentication Library) setup for "Sign in with Microsoft".
// VITE_MS_CLIENT_ID comes from a free Azure App Registration — see the
// README section "Microsoft Sign-In Setup" for the exact steps.
// If it's not set, the Microsoft button is simply hidden (see Login.jsx).

export const MS_CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID || '';
const MS_TENANT = import.meta.env.VITE_MS_TENANT || 'common';

export const msalConfig = {
  auth: {
    clientId: MS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MS_TENANT}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequestScopes = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
