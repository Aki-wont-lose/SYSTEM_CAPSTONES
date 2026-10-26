// src/constants/studentRules.js
//
// Frontend mirror of backend/src/utils/studentValidation.js. Keep the two in
// sync. The backend re-validates everything, so this only improves the UX.
import { PROGRAM_VALUES } from './programs';

// Official institutional domains (both accepted).
export const INSTITUTIONAL_DOMAINS = ['stamaria.edu.ph', 'stamaria.sti.edu.ph'];

// Reuse the one program list the rest of the app already reads from.
export const SUPPORTED_PROGRAMS = PROGRAM_VALUES;

const STUDENT_ID_RE = /^\d{6}$/;

export const STUDENT_ID_ERROR = 'Student ID must be a 6-digit number (e.g., 352467).';

export const isValidStudentId = (studentId) => STUDENT_ID_RE.test(String(studentId || '').trim());

const DOMAIN_PATTERN = INSTITUTIONAL_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|');
const EMAIL_RE = new RegExp(
  `^[A-Za-z]+(?:[.\\-][A-Za-z]+)*\\.\\d{6}@(?:${DOMAIN_PATTERN})$`,
  'i'
);

export const ELMS_EMAIL_ERROR =
  'Invalid ELMS email format. Please use your official school email (e.g., LastName.123456@stamaria.sti.edu.ph).';

export const isValidStudentEmail = (email) => EMAIL_RE.test(String(email || '').trim());

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

const SECTION_RE = /^([A-Z]+)\s+([1-4])-(10[1-3])$/;
const LEGACY_SECTION_RE = /^(?:([A-Z]+)[\s\-]+)?([1-4])-(10[1-3])$/;
const normalizeSection = (section) =>
  String(section || '').trim().replace(/\s+/g, ' ').toUpperCase();

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

export const deriveYearLevel = (section) => {
  const norm = normalizeSection(section);
  const match = norm.match(SECTION_RE) || norm.match(LEGACY_SECTION_RE);
  return match ? Number(match[2]) : null;
};

export const YEAR_LEVEL_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
export const formatYearLevel = (year) => YEAR_LEVEL_LABELS[year] || '';

// Official section catalog grouped by program (each program: 1-101 .. 4-103).
export const SECTIONS_BY_PROGRAM = SUPPORTED_PROGRAMS.reduce((acc, program) => {
  acc[program] = [1, 2, 3, 4].flatMap((year) =>
    [1, 2, 3].map((block) => `${program} ${year}-10${block}`)
  );
  return acc;
}, {});

export const sectionsForProgram = (program) =>
  SECTIONS_BY_PROGRAM[String(program || '').trim().toUpperCase()] || [];

// Sections are stored in the official "<PROGRAM> <year>-<block>" form - that is
// what the backend validates and derives the year level from, and what the CSV
// template ships. When the course is already on screen next to the section,
// render only "<year>-<block>" so the program is not printed twice.
export const sectionLabel = (section, program) => {
  const value = String(section || '').trim();
  const prefix = String(program || '').trim().toUpperCase();
  if (prefix && value.toUpperCase().startsWith(`${prefix} `)) return value.slice(prefix.length).trim();
  return value;
};

// Flat list of every official section (used by the CSV/XLSX import template).
export const generateSections = () => SUPPORTED_PROGRAMS.flatMap((program) => SECTIONS_BY_PROGRAM[program]);
