// src/utils/simesValidation.js
// Centralized data validation helpers for schedules, requirements/deadlines,
// logs/integration papers, and partner company academic validity periods.

const makeError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const VALID_DAY_TOKEN = /\b(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?|daily|weekdays)\b/i;
const VALID_TIME_RANGE = /(\d{1,2}(:\d{2})?\s*(am|pm)?\s*[-–to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)?)/i;

export const validateScheduleInput = ({ workingDays, workingHours, reason } = {}) => {
  const days = String(workingDays || '').trim();
  const hours = String(workingHours || '').trim();
  const cleanReason = reason !== undefined && reason !== null ? String(reason).trim() : null;

  if (!days || !hours) {
    throw makeError('Working days and working hours are required.');
  }
  if (days.length > 120) {
    throw makeError('Working days must be 120 characters or fewer.');
  }
  if (!VALID_DAY_TOKEN.test(days)) {
    throw makeError('Working days must include valid day names (e.g., Mon, Tue, Wed or Monday - Friday).');
  }
  if (hours.length > 100) {
    throw makeError('Working hours must be 100 characters or fewer.');
  }
  if (!VALID_TIME_RANGE.test(hours)) {
    throw makeError('Working hours must be a valid time range (e.g., 8:00 AM - 5:00 PM).');
  }
  if (cleanReason && cleanReason.length > 300) {
    throw makeError('Reason for schedule change must be 300 characters or fewer.');
  }

  return { days, hours, reason: cleanReason || null };
};

export const validateRequirementInput = (data = {}, { isCreate = false } = {}) => {
  if (isCreate && !String(data.title || '').trim()) {
    throw makeError('Requirement title is required.');
  }
  if (data.title !== undefined && String(data.title || '').trim().length > 150) {
    throw makeError('Requirement title must be 150 characters or fewer.');
  }
  if (data.description !== undefined && String(data.description || '').length > 2000) {
    throw makeError('Requirement description must be 2000 characters or fewer.');
  }
  if (data.dueTime !== undefined && data.dueTime !== null && String(data.dueTime).trim() !== '') {
    const timeStr = String(data.dueTime).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
      throw makeError('Due time must be in 24-hour HH:MM format (e.g., 17:00).');
    }
  }

  let parsedAssigned = null;
  if (data.assignedDate !== undefined && data.assignedDate !== null && String(data.assignedDate).trim() !== '') {
    parsedAssigned = new Date(data.assignedDate);
    if (Number.isNaN(parsedAssigned.getTime())) {
      throw makeError('Assigned date is invalid.');
    }
  }

  let parsedDue = null;
  if (data.dueDate !== undefined && data.dueDate !== null && String(data.dueDate).trim() !== '') {
    const raw = String(data.dueDate).trim();
    parsedDue = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T${/^\d{2}:\d{2}$/.test(String(data.dueTime || '').trim()) ? `${String(data.dueTime).trim()}:00` : '23:59:59'}+08:00`)
      : new Date(raw);
    if (Number.isNaN(parsedDue.getTime())) {
      throw makeError('Due date is invalid.');
    }
  }

  if (parsedAssigned && parsedDue && parsedDue.getTime() < parsedAssigned.getTime()) {
    throw makeError('Due date cannot be earlier than the assigned date.');
  }

  if (data.maxScore !== undefined && data.maxScore !== null && data.maxScore !== '') {
    const score = Number(data.maxScore);
    if (!Number.isFinite(score) || score < 0 || score > 1000) {
      throw makeError('Max score must be a number between 0 and 1000.');
    }
  }

  if (data.dueInDays !== undefined && data.dueInDays !== null && data.dueInDays !== '') {
    const days = Number(data.dueInDays);
    if (!Number.isFinite(days) || days < 0 || days > 365) {
      throw makeError('Due in days must be a number between 0 and 365.');
    }
  }
};

export const VALID_LOG_TYPES = ['DAILY_LOG', 'INTEGRATION_PAPER'];

export const validateLogEntryInput = ({ logType, date, taskDescription, submissionFile, submissionFileName } = {}) => {
  const normalizedType = logType === undefined || logType === null || logType === ''
    ? 'DAILY_LOG'
    : String(logType).trim().toUpperCase();

  if (!VALID_LOG_TYPES.includes(normalizedType)) {
    throw makeError('Invalid log type. Must be DAILY_LOG or INTEGRATION_PAPER.');
  }

  const trimmedTask = String(taskDescription || '').trim()
    || (normalizedType === 'INTEGRATION_PAPER' ? 'Integration Paper Submission' : '');

  if (!trimmedTask) {
    throw makeError('Task description is required.');
  }
  if (trimmedTask.length > 2000) {
    throw makeError('Task description must be 2000 characters or fewer.');
  }

  if (normalizedType === 'INTEGRATION_PAPER' && (!submissionFile || !submissionFileName)) {
    throw makeError('Please attach your Integration Paper file.');
  }

  const logDate = date ? new Date(date) : new Date();
  if (Number.isNaN(logDate.getTime())) {
    throw makeError('Invalid log date.');
  }

  return { logType: normalizedType, trimmedTask, logDate };
};

export const validateAcademicYearFormat = (academicYear) => {
  const ay = String(academicYear || '').trim();
  const match = ay.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    throw makeError('Academic year must follow the YYYY-YYYY format (e.g., 2026-2027).');
  }
  const startYr = Number(match[1]);
  const endYr = Number(match[2]);
  if (endYr !== startYr + 1) {
    throw makeError('Academic year end year must be one year after the start year (e.g., 2026-2027).');
  }
  return ay;
};
