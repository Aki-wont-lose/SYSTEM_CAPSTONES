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

// Official 6-digit STI student ID (e.g., 352467)
const STUDENT_ID_RE = /^\d{6}$/;

export const STUDENT_ID_ERROR = 'Student ID must be a 6-digit number (e.g., 352467).';

export const isValidStudentId = (studentId) => STUDENT_ID_RE.test(String(studentId || '').trim());

// Official ELMS student email: <name>.<6-digit student number>@<domain>
//   valid:   Cruz.352467@stamaria.edu.ph
const DOMAIN_PATTERN = INSTITUTIONAL_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|');
const EMAIL_RE = new RegExp(
  `^[A-Za-z]+(?:[.\\-][A-Za-z]+)*\\.\\d{6}@(?:${DOMAIN_PATTERN})$`,
  'i'
);

export const ELMS_EMAIL_ERROR =
  'Invalid ELMS email format. Please use your official school email (e.g., LastName.123456@stamaria.sti.edu.ph).';

export const isValidStudentEmail = (email) => EMAIL_RE.test(String(email || '').trim());

// Validates that the email's 6-digit number and surname prefix match studentId and lastName
export const validateStudentEmailMatch = ({ email, studentId, lastName }) => {
  const cleanEmail = String(email || '').trim();
  if (!isValidStudentEmail(cleanEmail)) {
    return ELMS_EMAIL_ERROR;
  }
  const localPart = cleanEmail.split('@')[0] || '';
  const lastDotIdx = localPart.lastIndexOf('.');
  const emailNamePart = lastDotIdx !== -1 ? localPart.slice(0, lastDotIdx) : '';
  const emailDigits = lastDotIdx !== -1 ? localPart.slice(lastDotIdx + 1) : '';

  const cleanId = String(studentId || '').trim();
  if (cleanId && isValidStudentId(cleanId) && emailDigits !== cleanId) {
    return `The 6-digit number in the email (${emailDigits}) must match the Student ID (${cleanId}).`;
  }

  const cleanLast = String(lastName || '').trim();
  if (cleanLast) {
    const emailLetters = emailNamePart.toLowerCase().replace(/[^a-z]/g, '');
    const fullLastLetters = cleanLast.toLowerCase().replace(/[^a-z]/g, '');
    const words = cleanLast.split(/[\s\-]+/).filter(Boolean);
    const lastWordLetters = (words[words.length - 1] || '').toLowerCase().replace(/[^a-z]/g, '');
    const matchesFull = emailLetters === fullLastLetters;
    const matchesCompoundLastWord = words.length > 1 && lastWordLetters.length >= 2 && emailLetters === lastWordLetters;
    if (fullLastLetters && !matchesFull && !matchesCompoundLastWord) {
      return `The email prefix (${emailNamePart}) must match the student's Last Name (${cleanLast}).`;
    }
  }

  return null;
};

export const CONTACT_NUMBER_ERROR =
  'Please enter a valid contact number (e.g., 09171234567 or +639171234567).';

export const isValidContactNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw || raw === 'Not set') return true;
  const cleaned = raw.replace(/[\s\-()]/g, '');
  return /^(?:09\d{9}|\+?639\d{9}|\d{7,11})$/.test(cleaned);
};

export const ELMS_SECTION_ERROR = 'Please select a valid section (e.g., BSIT 1-101).';

// Section format: "<PROGRAM> <year>-<block>", e.g. "BSIT 1-101".
// Years are 1..4, blocks are 101..103.
const SECTION_RE = /^([A-Z]+)\s+([1-4])-(10[1-3])$/;
const LEGACY_SECTION_RE = /^(?:([A-Z]+)[\s\-]+)?([1-4])-(10[1-3])$/;

const normalizeSection = (section) => String(section || '').trim().toUpperCase();

export const canonicalSection = (section, program) => {
  const norm = normalizeSection(section);
  if (!norm) return '';
  if (SECTION_RE.test(norm)) return norm;
  const legacyMatch = norm.match(LEGACY_SECTION_RE);
  const prog = String(program || legacyMatch?.[1] || '').trim().toUpperCase();
  if (legacyMatch && SUPPORTED_PROGRAMS.includes(prog)) {
    return `${prog} ${legacyMatch[2]}-${legacyMatch[3]}`;
  }
  return String(section || '').trim();
};

export const isValidSection = (section, program) => {
  const candidate = canonicalSection(section, program);
  const match = normalizeSection(candidate).match(SECTION_RE);
  if (!match || !SUPPORTED_PROGRAMS.includes(match[1])) return false;
  if (program && String(program).trim().toUpperCase() !== match[1]) return false;
  return true;
};

// Year level is ALWAYS derived from the section - never trusted from the client
// and never stored, so the section and the year can never disagree.
export const deriveYearLevel = (section) => {
  const norm = normalizeSection(section);
  const match = norm.match(SECTION_RE) || norm.match(LEGACY_SECTION_RE);
  return match ? Number(match[2]) : null;
};

export const YEAR_LEVEL_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
export const formatYearLevel = (year) => YEAR_LEVEL_LABELS[year] || '';

// Generates every official section, e.g. BSIT 1-101 .. BSIT 4-103.
export const generateSections = () =>
  SUPPORTED_PROGRAMS.flatMap((program) =>
    [1, 2, 3, 4].flatMap((year) => [1, 2, 3].map((block) => `${program} ${year}-10${block}`))
  );
