export const PROGRAM_OPTIONS = [
  { value: 'BSIT', label: 'BSIT' },
  { value: 'BSCS', label: 'BSCS' },
  { value: 'BSCPE', label: 'BSCPE' },
  { value: 'BSACT', label: 'BSACT' },
  { value: 'BSHM', label: 'BSHM' },
  { value: 'BSTM', label: 'BSTM' },
  { value: 'BSAIS', label: 'BSAIS' },
];

export const PROGRAM_VALUES = PROGRAM_OPTIONS.map((program) => program.value);

export const COURSE_LABELS = {
  BSIT: 'Information Technology (IT)',
  BSCS: 'Computer Science (CS)',
  BSCPE: 'Computer Engineering (CPE)',
  BSACT: 'Associate in Computer Technology (ACT)',
  BSHM: 'Hospitality Management (HM)',
  BSTM: 'Tourism Management (TM)',
  BSAIS: 'Accounting Information System (AIS)',
};

export const courseLabel = (value) => COURSE_LABELS[value] || value || '';
