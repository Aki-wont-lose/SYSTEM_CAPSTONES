export const PROGRAM_OPTIONS = [
  { value: 'BSIT', label: 'BSIT' },
  { value: 'BSCS', label: 'BSCS' },
  { value: 'BSCPE', label: 'BSCPE' },
  { value: 'ACT', label: 'ACT' },
  { value: 'BSHM', label: 'BSHM' },
  { value: 'BSTM', label: 'BSTM' },
  { value: 'BSAIS', label: 'BSAIS' },
];

export const PROGRAM_VALUES = PROGRAM_OPTIONS.map((program) => program.value);

export const normalizeCourseCode = (value) => {
  const upper = String(value || '').trim().toUpperCase();
  if (upper === 'BSACT' || upper === 'BSAC') return 'ACT';
  return upper;
};

export const COURSE_LABELS = {
  BSIT: 'Information Technology (IT)',
  BSCS: 'Computer Science (CS)',
  BSCPE: 'Computer Engineering (CPE)',
  ACT: 'Associate in Computer Technology (ACT)',
  BSACT: 'Associate in Computer Technology (ACT)',
  BSAC: 'Associate in Computer Technology (ACT)',
  BSHM: 'Hospitality Management (HM)',
  BSTM: 'Tourism Management (TM)',
  BSAIS: 'Accounting Information System (AIS)',
};

export const courseLabel = (value) => {
  const normalized = normalizeCourseCode(value);
  return COURSE_LABELS[normalized] || COURSE_LABELS[value] || normalized || '';
};
