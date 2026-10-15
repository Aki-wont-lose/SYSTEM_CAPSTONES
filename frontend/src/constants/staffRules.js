// src/constants/staffRules.js
//
// Frontend mirror of backend/src/utils/staffValidation.js. Keep the two in sync.
// The backend re-validates on create, so this only improves the UX.
//
// Staff (admin, coordinator, supervisor) use the institutional format
// <firstname>.<lastname>@stamaria.sti.edu.ph.

const STAFF_EMAIL_RE = /^[A-Za-z]+(?:\.[A-Za-z]+)+@stamaria\.sti\.edu\.ph$/i;

export const STAFF_EMAIL_ERROR = 'Invalid ELMS email format. Please use your official school email.';

export const isValidStaffEmail = (email) => STAFF_EMAIL_RE.test(String(email || '').trim());
