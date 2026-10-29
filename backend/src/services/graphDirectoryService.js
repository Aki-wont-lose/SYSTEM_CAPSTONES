// src/services/graphDirectoryService.js
//
// Server-side Microsoft Graph directory lookup used to answer one question at
// account-creation time: "does this school mailbox exist in the authorized
// Microsoft 365 tenant?"
//
// Why this is optional: the @stamaria.sti.edu.ph mailboxes live in the school's
// tenant. Reading them requires an app registration *in that tenant* with the
// application permission User.Read.All and admin consent. Without those values
// the check is simply unavailable — and this module says so instead of
// pretending the address is valid.
//
// Fail-safe rules:
//   * A definitive 404 (Graph says the user does not exist) is rejected in
//     every mode where Graph is reachable.
//   * Permission errors / outages / missing configuration never produce
//     "verified". In `enforce` they block creation; in `warn` the account is
//     created but remains explicitly unverified until its first Microsoft
//     sign-in.
//   * The client secret is read from the server environment only. It is never
//     sent to, or read from, the browser.

import {
  getVerificationMode,
  isSchoolAccountRole,
  getSchoolTenantId
} from './microsoftAccountPolicy.js';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const LOOKUP_TIMEOUT_MS = 8000;
const TOKEN_SAFETY_WINDOW_MS = 60 * 1000;

const CONFIG_HELP =
  'Set MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID and MS_GRAPH_CLIENT_SECRET on the server, ' +
  'then grant the application permission User.Read.All with admin consent in the school tenant.';

const readGraphConfig = () => {
  const tenantId = String(process.env.MS_GRAPH_TENANT_ID || '').trim();
  const clientId = String(process.env.MS_GRAPH_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MS_GRAPH_CLIENT_SECRET || '').trim();
  return {
    tenantId,
    clientId,
    clientSecret,
    configured: Boolean(tenantId && clientId && clientSecret)
  };
};

export const getGraphConfigStatus = () => {
  const { tenantId, clientId, clientSecret, configured } = readGraphConfig();
  return {
    configured,
    tenantIdPresent: Boolean(tenantId),
    clientIdPresent: Boolean(clientId),
    clientSecretPresent: Boolean(clientSecret)
  };
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Client-credentials token, cached in memory only for the lifetime of the
// process. Never persisted, never returned to a client.
let tokenCache = { accessToken: '', expiresAt: 0, tenantId: '' };

const getAccessToken = async ({ tenantId, clientId, clientSecret }) => {
  if (
    tokenCache.accessToken &&
    tokenCache.tenantId === tenantId &&
    tokenCache.expiresAt > Date.now() + TOKEN_SAFETY_WINDOW_MS
  ) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetchWithTimeout(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body
    }
  );

  if (!response.ok) {
    throw new Error(`Microsoft token request failed (HTTP ${response.status})`);
  }

  const payload = await response.json();
  const expiresIn = Number(payload.expires_in) || 3600;
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
    tenantId
  };
  return tokenCache.accessToken;
};

const interpretGraphUser = (user) => {
  if (!user) return { status: 'not-found' };
  if (user.accountEnabled === false) {
    return { status: 'disabled', directoryId: user.id || null, displayName: user.displayName || null };
  }
  return {
    status: 'found',
    directoryId: user.id || null,
    displayName: user.displayName || null,
    userPrincipalName: user.userPrincipalName || user.mail || null
  };
};

// Some tenants give the mailbox an alias that differs from the UPN, so a direct
// /users/{email} lookup can 404 even though the person exists. This fallback
// searches by mail/userPrincipalName before a 404 is treated as definitive.
const findUserByEmailFilter = async (accessToken, email) => {
  const escaped = String(email).replace(/'/g, "''");
  const filter = `mail eq '${escaped}' or userPrincipalName eq '${escaped}'`;
  const url =
    `${GRAPH_BASE}/users?$filter=${encodeURIComponent(filter)}` +
    '&$select=id,displayName,mail,userPrincipalName,accountEnabled&$top=1';
  const response = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  if (response.status === 404) return { status: 'not-found' };
  if (response.status === 401 || response.status === 403) {
    return { status: 'permission-error', httpStatus: response.status };
  }
  if (!response.ok) return { status: 'error', httpStatus: response.status };
  const payload = await response.json();
  const user = Array.isArray(payload?.value) ? payload.value[0] : null;
  return interpretGraphUser(user);
};

// Returns a structured result instead of throwing, so callers can decide how
// strict to be. Statuses:
//   found | not-found | disabled | not-configured | permission-error | error
export const lookupSchoolMailbox = async (email) => {
  const config = readGraphConfig();
  if (!config.configured) return { status: 'not-configured' };

  const cleanedEmail = String(email || '').trim();
  if (!cleanedEmail) return { status: 'error', detail: 'An email address is required for the directory lookup.' };

  try {
    const accessToken = await getAccessToken(config);
    const url = `${GRAPH_BASE}/users/${encodeURIComponent(cleanedEmail)}?$select=id,displayName,mail,userPrincipalName,accountEnabled`;
    const response = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });

    if (response.status === 404) {
      // Give an alias-based account a second chance before rejecting it.
      return await findUserByEmailFilter(accessToken, cleanedEmail);
    }
    if (response.status === 401 || response.status === 403) {
      return { status: 'permission-error', httpStatus: response.status };
    }
    if (!response.ok) return { status: 'error', httpStatus: response.status };

    const user = await response.json();
    return interpretGraphUser(user);
  } catch (error) {
    return { status: 'error', detail: error?.message || 'Unknown directory error' };
  }
};

// The creation-time gate. Company supervisors are exempt (they may use personal
// accounts and are verified by a successful Microsoft sign-in instead).
//
// Resolves to a verification descriptor, or throws when the account must not be
// created. It NEVER returns verified:true based on the email format alone.
export const verifySchoolAccountForCreation = async (email, role) => {
  if (!isSchoolAccountRole(role)) {
    return {
      required: false,
      verified: false,
      status: 'not-required',
      source: null,
      message: 'Personal Microsoft accounts are allowed for this role and are verified on first Microsoft sign-in.'
    };
  }

  const mode = getVerificationMode();
  if (mode === 'off') {
    return {
      required: true,
      verified: false,
      status: 'unverified',
      source: null,
      reason: 'verification-disabled',
      message: 'Microsoft directory verification is turned off. This account stays unverified until its first Microsoft sign-in.'
    };
  }

  const lookup = await lookupSchoolMailbox(email);

  if (lookup.status === 'found') {
    return {
      required: true,
      verified: true,
      status: 'verified',
      source: 'graph',
      directoryId: lookup.directoryId,
      displayName: lookup.displayName
    };
  }

  if (lookup.status === 'disabled') {
    throw httpError(
      403,
      `The school Microsoft 365 account ${email} exists but is disabled. Ask school IT to enable it before creating the SIMES account.`
    );
  }

  if (lookup.status === 'not-found') {
    throw httpError(
      400,
      `This school email does not exist in the authorized Microsoft 365 tenant: ${email}. ` +
        'Check the student/staff record in Microsoft 365 before creating the SIMES account.'
    );
  }

  // Missing configuration, insufficient permission, or an outage. Fail closed
  // in enforce mode; otherwise leave the account explicitly unverified.
  const detail =
    lookup.status === 'not-configured'
      ? 'Microsoft directory verification is not configured on this server.'
      : lookup.status === 'permission-error'
        ? `Microsoft Graph denied the directory lookup (HTTP ${lookup.httpStatus}). The app needs User.Read.All with admin consent.`
        : `The Microsoft Graph directory lookup failed${lookup.httpStatus ? ` (HTTP ${lookup.httpStatus})` : ''}.`;

  if (mode === 'enforce') {
    throw httpError(503, `${detail} ${CONFIG_HELP}`);
  }

  console.warn(`[microsoft] Directory verification unavailable for ${email}: ${detail}`);
  return {
    required: true,
    verified: false,
    status: 'unverified',
    source: null,
    reason: lookup.status,
    message: 'The school mailbox could not be verified right now. The account stays unverified until its first Microsoft sign-in.'
  };
};

// Used by diagnostics/reporting: the tenant the Graph app is pointed at should
// normally match MS_SCHOOL_TENANT_ID.
export const getGraphTenantMatchesSchoolTenant = () => {
  const config = readGraphConfig();
  const schoolTenant = getSchoolTenantId();
  if (!config.tenantId || !schoolTenant) return null;
  return config.tenantId.toLowerCase() === schoolTenant.toLowerCase();
};
