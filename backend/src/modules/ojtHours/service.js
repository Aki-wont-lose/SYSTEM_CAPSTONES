// modules/ojtHours/service.js - admin-maintained required OJT hours & accepted internship courses
import prisma from '../../utils/prisma.js';
import { SUPPORTED_PROGRAMS, normalizeCourseCode } from '../../utils/studentValidation.js';


const ACCEPTED_COURSES_ENTITY = 'AcceptedCoursesConfig';

const DEFAULT_HOURS_BY_COURSE = {
  BSIT: 486,
  BSCS: 486,
  BSCPE: 486,
  ACT: 320,
  BSHM: 600,
  BSTM: 600,
  BSAIS: 486
};

export const getOjtHours = async () => {
  const rows = await prisma.ojtHoursConfig.findMany({
    orderBy: { course: 'asc' },
    select: { id: true, course: true, requiredHours: true, createdAt: true, updatedAt: true }
  });

  const byCourse = new Map();
  for (const row of rows) {
    const normalized = normalizeCourseCode(row.course);
    if (!SUPPORTED_PROGRAMS.includes(normalized)) continue;
    // Prefer canonical 'ACT' row over legacy 'BSACT' if both exist
    if (!byCourse.has(normalized) || row.course === normalized) {
      byCourse.set(normalized, { ...row, course: normalized });
    }
  }

  for (const course of SUPPORTED_PROGRAMS) {
    if (!byCourse.has(course)) {
      byCourse.set(course, {
        id: `default-${course}`,
        course,
        requiredHours: DEFAULT_HOURS_BY_COURSE[course] || 486,
        createdAt: null,
        updatedAt: null
      });
    }
  }

  return SUPPORTED_PROGRAMS.map((course) => byCourse.get(course));
};

export const updateOjtHours = async (rawCourse, requiredHours) => {
  const course = normalizeCourseCode(rawCourse);
  if (!course || !SUPPORTED_PROGRAMS.includes(course) || requiredHours === undefined || requiredHours === null) {
    const e = new Error('Valid course and requiredHours are required');
    e.status = 400;
    throw e;
  }
  const hours = Number(requiredHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 2000) {
    const e = new Error('requiredHours must be a whole number between 1 and 2000');
    e.status = 400;
    throw e;
  }

  // Pull the previous default (checking both ACT and legacy BSACT) so existing students
  // who are still on it pick up the new value, while a per-student manual override is left untouched.
  const courseVariants = course === 'ACT' ? ['ACT', 'BSACT', 'BSAC'] : [course];
  const previous = await prisma.ojtHoursConfig.findFirst({
    where: { course: { in: courseVariants } },
    select: { requiredHours: true }
  });

  const [config] = await prisma.$transaction([
    prisma.ojtHoursConfig.upsert({
      where: { course },
      update: { requiredHours: hours },
      create: { course, requiredHours: hours },
      select: { id: true, course: true, requiredHours: true }
    }),
    prisma.student.updateMany({
      where: {
        course: { in: courseVariants },
        isArchived: false,
        ...(previous ? { requiredHours: previous.requiredHours } : {})
      },
      data: { requiredHours: hours, course }
    })
  ]);

  return config;
};

export const getOjtHoursByCourse = async (rawCourse) => {
  const course = normalizeCourseCode(rawCourse);
  const courseVariants = course === 'ACT' ? ['ACT', 'BSACT', 'BSAC'] : [course];
  return prisma.ojtHoursConfig.findFirst({
    where: { course: { in: courseVariants } },
    select: { requiredHours: true }
  });
};

// Retrieve the list of courses officially accepted for internship
export const getAcceptedInternshipCourses = async () => {
  return {
    acceptedCourses: [...SUPPORTED_PROGRAMS],
    availableCourses: SUPPORTED_PROGRAMS,
    updatedAt: null,
    updatedBy: null
  };
};

// Update the list of courses officially accepted for internship (ADMIN only)
export const updateAcceptedInternshipCourses = async (courses, actor = null) => {
  if (!Array.isArray(courses)) {
    const e = new Error('acceptedCourses must be an array of course codes');
    e.status = 400;
    throw e;
  }

  const normalized = [];
  for (const raw of courses) {
    const code = normalizeCourseCode(raw);
    if (!code) continue;
    if (!SUPPORTED_PROGRAMS.includes(code)) {
      const e = new Error(`Course "${raw}" is not a recognized STI program. Valid programs: ${SUPPORTED_PROGRAMS.join(', ')}`);
      e.status = 400;
      throw e;
    }
    if (!normalized.includes(code)) normalized.push(code);
  }

  if (normalized.length === 0) {
    const e = new Error('At least one course must be accepted for internship.');
    e.status = 400;
    throw e;
  }

  return {
    acceptedCourses: normalized,
    availableCourses: SUPPORTED_PROGRAMS,
    updatedAt: new Date(),
    updatedBy: actor?.email || null
  };
};

export const assertCourseAcceptedForInternship = async (rawCourse) => {
  const course = normalizeCourseCode(rawCourse);
  if (!course || !SUPPORTED_PROGRAMS.includes(course)) {
    const e = new Error(
      `Course "${rawCourse || 'Unknown'}" is not eligible for internship. Accepted courses: ${SUPPORTED_PROGRAMS.join(', ')}.`
    );
    e.status = 400;
    throw e;
  }
  return course;
};
