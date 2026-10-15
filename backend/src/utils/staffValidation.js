// src/utils/staffValidation.js
//
// Official institutional email rule for staff accounts (admin, coordinator and
// supervisor): <firstname>.<lastname>@stamaria.sti.edu.ph
//   valid:   laracamille.vergara@stamaria.sti.edu.ph
//   invalid: laracamille@stamaria.sti.edu.ph   (missing last name)
//            laracamille.vergara@gmail.com     (wrong domain)
//
// The backend re-validates every account creation, so a direct API call or a
// batch row can never create a staff account with a mistyped email. The
// frontend keeps a mirror in frontend/src/constants/staffRules.js.

const STAFF_EMAIL_RE = /^[A-Za-z]+(?:\.[A-Za-z]+)+@stamaria\.sti\.edu\.ph$/i;

export const STAFF_EMAIL_ERROR = 'Invalid ELMS email format. Please use your official school email.';

export const isValidStaffEmail = (email) => STAFF_EMAIL_RE.test(String(email || '').trim());
