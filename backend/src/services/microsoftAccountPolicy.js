// src/services/microsoftAccountPolicy.js
//
// Single source of truth for *which* Microsoft account each SIMES role may use.
// This module is deliberately pure (no Prisma, no network) so the rules can be
// unit-tested and reused by creation, login and profile linking.
//
// The rules the brief requires:
//   - STUDENT, ADMIN, COORDINATOR (including the super-admin) must use an
//     authorized STI College Sta. Maria school account.
//   - SUPERVISOR may use a personal Microsoft account (Outlook.com/Hotmail.com).
//
// A domain match here is only a *policy gate* — it is never treated as proof
// that the mailbox exists. Existence is proven either by a Graph directory
// lookup at creation time (see graphDirectoryService.js) or by a successful
// Microsoft sign-in at login time.

import { INSTITUTIONAL_DOMAINS } from '../utils/studentValidation.js';

export const SCHOOL_ACCOUNT_ROLES = Object.freeze(['STUDENT', 'ADMIN', 'COORDINATOR']);
export const PERSONAL_ACCOUNT_ROLES = Object.freeze(['SUPERVISOR']);

// Kept in sync with the existing student/staff validation rules. Both domains
// are accepted because the institution's Microsoft tenant may use either one.
export const SCHOOL_EMAIL_DOMAINS = Object.freeze([...INSTITUTIONAL_DOMAINS]);

export const VERIFICATION_MODES = Object.freeze(['off', 'warn', 'enforce']);
export const DEFAULT_VERIFICATION_MODE = 'warn';

const GENERAL_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NON_TENANT_VALUES = new Set(['', 'common', 'organizations', 'consumers', 'botframework.com']);

const ROLE_LABELS = {
  STUDENT: 'Student',
  ADMIN: 'Administrator',
  COORDINATOR: 'Coordinator',
  SUPERVISOR: 'Company supervisor'
};

export const isSchoolAccountRole = (role) =>
  SCHOOL_ACCOUNT_ROLES.includes(String(role || '').trim().toUpperCase());

export const isPersonalAccountRole = (role) =>
  PERSONAL_ACCOUNT_ROLES.includes(String(role || '').trim().toUpperCase());

// True only for an address on one of the institution's domains. This says the
// address *looks* institutional; it does not prove the account exists.
export const isSchoolEmail = (email) => {
  const cleaned = String(email || '').trim().toLowerCase();
  const at = cleaned.lastIndexOf('@');
  if (at <= 0 || at === cleaned.length - 1) return false;
  return SCHOOL_EMAIL_DOMAINS.includes(cleaned.slice(at + 1));
};

const normalizeMode = (value) => {
  const mode = String(value || '').trim().toLowerCase();
  return VERIFICATION_MODES.includes(mode) ? mode : null;
};

// MS_ACCOUNT_VERIFY:
//   off     - do not call Graph at creation time; accounts stay unverified
//             until their first Microsoft sign-in.
//   warn    - call Graph when configured; if it is not configured or fails,
//             create the account but explicitly mark it unverified. A
//             definitive "user does not exist" answer is still rejected.
//   enforce - call Graph and fail closed: missing configuration, permission
//             errors and outages all block creation.
// The default is "warn" so an existing deployment without Graph credentials
// keeps working; it never claims an account is verified.
export const getVerificationMode = () =>
  normalizeMode(process.env.MS_ACCOUNT_VERIFY) || DEFAULT_VERIFICATION_MODE;

// The tenant that is allowed to issue school accounts. Kept separate from
// MS_TENANT (which is deliberately "common" so personal supervisor accounts can
// authenticate). An empty value means "not configured yet" — it is NOT treated
// as "any tenant is fine" inside verification, only as an unavailable check.
export const getSchoolTenantId = () => {
  const value = String(process.env.MS_SCHOOL_TENANT_ID || '').trim().toLowerCase();
  return NON_TENANT_VALUES.has(value) ? '' : value;
};

const schoolDomainList = () => SCHOOL_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(' or ');

// The single super-admin is a bootstrap account configured by email. Some
// deployments (including the current one) started with a personal Microsoft
// account because no school account existed yet. Locking it out on deploy would
// leave the system with no operator, so a *single, explicitly opted-in*
// transition exception is supported. It is OFF by default: add
// SUPER_ADMIN_BOOTSTRAP_PERSONAL=true only while moving the super-admin to a
// school account, then remove it.
// Mirrors the default in middleware/auth.js so the exception still targets the
// right account when SUPER_ADMIN_EMAIL is not set explicitly.
const DEFAULT_SUPER_ADMIN_EMAIL = 'mccruz1230@gmail.com';

export const isSuperAdminBootstrapEmail = (email) => {
  const superAdminEmail = String(process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  return Boolean(superAdminEmail) && String(email || '').trim().toLowerCase() === superAdminEmail;
};

const bootstrapPersonalExplicitlyAllowed = () =>
  String(process.env.SUPER_ADMIN_BOOTSTRAP_PERSONAL || '').trim().toLowerCase() === 'true';

const isBootstrapPersonalAllowed = (email) =>
  bootstrapPersonalExplicitlyAllowed() && isSuperAdminBootstrapEmail(email);

// Returns a human-readable error, or null when the address is allowed for the
// role. Used by both account creation and Microsoft login so there is only one
// rule, enforced in one place.
export const roleEmailError = ({ email, role }) => {
  const cleaned = String(email || '').trim();
  if (!cleaned || !GENERAL_EMAIL_RE.test(cleaned)) {
    return 'The Microsoft account did not return a valid email address.';
  }

  const normalizedRole = String(role || '').trim().toUpperCase();
  if (isSchoolAccountRole(normalizedRole) && !isSchoolEmail(cleaned)) {
    if (isBootstrapPersonalAllowed(cleaned)) {
      console.warn(
        `[microsoft] Super-admin bootstrap exception is active for ${cleaned}. ` +
          'Move the super-admin to a school account and remove SUPER_ADMIN_BOOTSTRAP_PERSONAL.'
      );
      return null;
    }
    return `${ROLE_LABELS[normalizedRole] || 'This role'} accounts must use an official STI College Sta. Maria Microsoft school account (${schoolDomainList()}). Personal Microsoft accounts are not allowed for this role.`;
  }

  return null;
};

// Returns a human-readable error, or null when the tenant is acceptable.
// Only applied when the school tenant is configured; otherwise the check is
// simply unavailable and is reported as such (never silently "passed").
export const tenantError = ({ tenantId, role, email }) => {
  if (!isSchoolAccountRole(role)) return null;
  const expected = getSchoolTenantId();
  if (!expected) return null;
  // The explicit bootstrap exception is the only personal account allowed to
  // skip the tenant check, and only for the configured super-admin email.
  if (isBootstrapPersonalAllowed(email)) return null;
  if (String(tenantId || '').trim().toLowerCase() !== expected) {
    return 'This Microsoft account does not belong to the authorized STI College Sta. Maria school organization. Sign in with your school account.';
  }
  return null;
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// Full gate for a Microsoft *sign-in*. Microsoft has already proven that the
// person controls the account before this runs; these checks decide whether
// that proven identity is allowed to act as the local role.
export const assertMicrosoftLoginAllowed = ({ email, role, tenantId, tid }) => {
  const emailMessage = roleEmailError({ email, role });
  if (emailMessage) throw httpError(403, emailMessage);

  const tenantMessage = tenantError({ tenantId: tenantId || tid, role, email });
  if (tenantMessage) throw httpError(403, tenantMessage);

  return true;
};

// Non-throwing description of the current configuration, used by the report and
// by a health/diagnostics endpoint if one is added later.
export const getMicrosoftPolicyStatus = () => ({
  verificationMode: getVerificationMode(),
  schoolTenantConfigured: Boolean(getSchoolTenantId()),
  schoolDomains: [...SCHOOL_EMAIL_DOMAINS],
  schoolRoles: [...SCHOOL_ACCOUNT_ROLES],
  personalAllowedRoles: [...PERSONAL_ACCOUNT_ROLES],
  superAdminBootstrapPersonal: bootstrapPersonalExplicitlyAllowed(),
  superAdminBootstrapEmail: bootstrapPersonalExplicitlyAllowed()
    ? String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase() || null
    : null
});
