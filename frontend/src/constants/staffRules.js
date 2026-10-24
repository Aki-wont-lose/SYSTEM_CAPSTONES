// src/constants/staffRules.js
//
// Frontend mirror of backend/src/utils/staffValidation.js. Keep the two in sync.

const SCHOOL_STAFF_EMAIL_RE = /^[A-Za-z0-9]+(?:[._\-][A-Za-z0-9]+)*@(?:stamaria\.sti\.edu\.ph|stamaria\.edu\.ph)$/i;
const GENERAL_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const STAFF_EMAIL_ERROR =
  'Invalid ELMS email format. Please use your official school email.';

export const SUPERVISOR_EMAIL_ERROR =
  'Please enter a valid email address for the company supervisor.';

export const isValidStaffEmail = (email, role = null) => {
  const cleaned = String(email || '').trim();
  if (!cleaned) return false;
  if (String(role || '').toUpperCase() === 'SUPERVISOR') {
    return GENERAL_EMAIL_RE.test(cleaned);
  }
  return SCHOOL_STAFF_EMAIL_RE.test(cleaned);
};

export const getStaffEmailError = (role = null) =>
  String(role || '').toUpperCase() === 'SUPERVISOR' ? SUPERVISOR_EMAIL_ERROR : STAFF_EMAIL_ERROR;

export const CONTACT_NUMBER_ERROR =
  'Please enter a valid contact number (e.g., 09171234567 or +639171234567).';

export const isValidContactNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'Not set') return true;
  const cleaned = raw.replace(/[\s\-()]/g, '');
  return /^(?:09\d{9}|\+?639\d{9}|\d{7,11})$/.test(cleaned);
};
