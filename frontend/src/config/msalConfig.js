// src/config/msalConfig.js
//
// MSAL (Microsoft Authentication Library) setup for "Sign in with Microsoft".
// VITE_MS_CLIENT_ID comes from a free Azure App Registration — see the
// README section "Microsoft Sign-In Setup" for the exact steps.
// The Client ID below is the fallback so the app works on hosts (e.g. Vercel)
// where no environment variable has been set. A Client ID is a public value:
// it ships inside the browser bundle and is not a secret.

const BAKED_MS_CLIENT_ID = 'df253f7d-abd6-47c3-90a8-40f1987f9c75';

export const MS_CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID || BAKED_MS_CLIENT_ID;
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
