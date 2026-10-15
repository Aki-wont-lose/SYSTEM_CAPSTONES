// src/utils/studentValidation.js
//
// Single source of truth for the strict ELMS institutional rules applied to
// student records. Both the normal create endpoint and the CSV batch endpoint
// flow through createStudent(), which calls these helpers, so a direct API call
// can never bypass what the registration form enforces.
//
// The frontend keeps a mirror of these rules in
// frontend/src/constants/studentRules.js.

// Official institutional domains. Both are accepted so a student whose
// Microsoft (SSO) tenant uses either domain can still match their SIMES email.
export const INSTITUTIONAL_DOMAINS = ['stamaria.edu.ph', 'stamaria.sti.edu.ph'];

// Supported academic programs. Official sections are generated from these.
export const SUPPORTED_PROGRAMS = ['BSIT', 'BSCS', 'BSCPE', 'BSACT', 'BSHM', 'BSTM', 'BSAIS'];

// Official ELMS student email: <name>.<6-digit student number>@<domain>
//   valid:   Cruz.352467@stamaria.edu.ph
//   invalid: Cruz@stamaria.edu.ph          (missing identifier)
//            Cruz.35246@stamaria.edu.ph    (only 5 digits)
//            Cruz.3524678@stamaria.edu.ph  (7 digits)
//            Cruz.352467@gmail.com         (wrong domain)
//            Cruz 352467@stamaria.edu.ph   (space)
//            Cruz..352467@stamaria.edu.ph  (double dot)
// The name portion is one or more letter groups joined by a single dot/hyphen.
const DOMAIN_PATTERN = INSTITUTIONAL_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|');
const EMAIL_RE = new RegExp(
  `^[A-Za-z]+(?:[.\\-][A-Za-z]+)*\\.\\d{6}@(?:${DOMAIN_PATTERN})$`,
  'i'
);

export const ELMS_EMAIL_ERROR =
  'Invalid ELMS email format. Please use your official school email.';

export const isValidStudentEmail = (email) => EMAIL_RE.test(String(email || '').trim());

export const ELMS_SECTION_ERROR = 'Please select a valid section (e.g., BSIT 1-101).';

// Section format: "<PROGRAM> <year>-<block>", e.g. "BSIT 1-101".
// Years are 1..4, blocks are 101..103. Written as a pattern (not one condition
// per section) so the mapping stays correct if the catalog grows.
const SECTION_RE = /^([A-Z]+)\s+([1-4])-(10[1-3])$/;

const normalizeSection = (section) => String(section || '').trim().toUpperCase();

export const isValidSection = (section) => {
  const match = normalizeSection(section).match(SECTION_RE);
  return !!match && SUPPORTED_PROGRAMS.includes(match[1]);
};

// Year level is ALWAYS derived from the section - never trusted from the client
// and never stored, so the section and the year can never disagree.
export const deriveYearLevel = (section) => {
  const match = normalizeSection(section).match(SECTION_RE);
  return match ? Number(match[2]) : null;
};

export const YEAR_LEVEL_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
export const formatYearLevel = (year) => YEAR_LEVEL_LABELS[year] || '';

// Generates every official section, e.g. BSIT 1-101 .. BSIT 4-103.
export const generateSections = () =>
  SUPPORTED_PROGRAMS.flatMap((program) =>
    [1, 2, 3, 4].flatMap((year) => [1, 2, 3].map((block) => `${program} ${year}-10${block}`))
  );
