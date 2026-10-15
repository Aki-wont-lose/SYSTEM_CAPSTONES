// src/constants/studentRules.js
//
// Frontend mirror of backend/src/utils/studentValidation.js. Keep the two in
// sync. The backend re-validates everything, so this only improves the UX.
import { PROGRAM_VALUES } from './programs';

// Official institutional domains (both accepted).
export const INSTITUTIONAL_DOMAINS = ['stamaria.edu.ph', 'stamaria.sti.edu.ph'];

// Reuse the one program list the rest of the app already reads from.
export const SUPPORTED_PROGRAMS = PROGRAM_VALUES;

const DOMAIN_PATTERN = INSTITUTIONAL_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|');
const EMAIL_RE = new RegExp(
  `^[A-Za-z]+(?:[.\\-][A-Za-z]+)*\\.\\d{6}@(?:${DOMAIN_PATTERN})$`,
  'i'
);

export const ELMS_EMAIL_HELPER = 'Use your official ELMS email, e.g., Cruz.345293@stamaria.edu.ph.';
export const ELMS_EMAIL_ERROR =
  'Invalid ELMS email format. Please use your official school email, including your required student identifier (e.g., Cruz.345293@stamaria.edu.ph).';

export const isValidStudentEmail = (email) => EMAIL_RE.test(String(email || '').trim());

const SECTION_RE = /^([A-Z]+)\s+([1-4])-(10[1-3])$/;
const normalizeSection = (section) => String(section || '').trim().toUpperCase();

export const isValidSection = (section) => {
  const match = normalizeSection(section).match(SECTION_RE);
  return !!match && SUPPORTED_PROGRAMS.includes(match[1]);
};

export const deriveYearLevel = (section) => {
  const match = normalizeSection(section).match(SECTION_RE);
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

// Flat list of every official section (used by the CSV/XLSX import template).
export const generateSections = () => SUPPORTED_PROGRAMS.flatMap((program) => SECTIONS_BY_PROGRAM[program]);
