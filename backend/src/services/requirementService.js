// src/services/requirementService.js
import { PrismaClient } from '@prisma/client';
import { recordAudit } from './auditLogService.js';
const prisma = new PrismaClient();

const startOfDay = (d) => new Date(new Date(d).setHours(0, 0, 0, 0));
const addDays = (d, days) => new Date(new Date(d).getTime() + days * 86400000);
const startOfWeek = (d) => {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
};

const resolveDueDate = (data) => {
  if (data.dueDate) return new Date(data.dueDate);
  if (data.dueInDays) return addDays(new Date(), Number(data.dueInDays));
  return null;
};

const REQUIREMENT_FIELDS = [
  'title',
  'description',
  'isRequired',
  'program',
  'category',
  'cadence',
  'dueInDays',
  'dueDate',
  'maxScore',
  'autoGradeOnSubmit',
  'sortOrder',
  'templateFile',
  'templateFileName'
];

const normalizeRequirementInput = (data) => {
  const payload = {};
  for (const field of REQUIREMENT_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field];
  }
  payload.program = payload.program ? String(payload.program).toUpperCase() : null;
  payload.category = payload.category ? String(payload.category).trim() : null;
  payload.dueDate = resolveDueDate(payload);
  if (payload.dueInDays != null) payload.dueInDays = Number(payload.dueInDays) || null;
  if (payload.maxScore != null) payload.maxScore = Number(payload.maxScore) || 0;
  if (payload.sortOrder != null) payload.sortOrder = Number(payload.sortOrder) || 0;
  payload.cadence = String(payload.cadence || 'ONCE').toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'ONCE';
  if (payload.autoGradeOnSubmit != null) payload.autoGradeOnSubmit = Boolean(payload.autoGradeOnSubmit);
  if (payload.isRequired != null) payload.isRequired = Boolean(payload.isRequired);
  if (payload.templateFile === null) payload.templateFile = null;
  if (payload.templateFileName === null) payload.templateFileName = null;
  return payload;
};

export const getAllRequirements = async (filters = {}) => {
  const where = {};
  if (filters.program && filters.program !== 'ALL') where.program = filters.program;
  if (filters.category) where.category = filters.category;
  if (filters.cadence) where.cadence = filters.cadence;

  return prisma.requirement.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { submissions: true } } }
  });
};

export const createRequirement = async (data) => {
  if (!data.title) {
    const error = new Error('Requirement title is required');
    error.status = 400;
    throw error;
  }
  return prisma.requirement.create({ data: normalizeRequirementInput(data) });
};

export const updateRequirement = async (id, data) => {
  try {
    const existing = await prisma.requirement.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Requirement not found');
      err.status = 404;
      throw err;
    }
    const merged = { ...existing, ...data };
    if (data.dueDate === null) merged.dueDate = null;
    return await prisma.requirement.update({ where: { id }, data: normalizeRequirementInput(merged) });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Requirement not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const deleteRequirement = async (id) => {
  try {
    return await prisma.requirement.delete({ where: { id } });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Requirement not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

// Effective deadline for a requirement: explicit dueDate, else dueInDays after posting
export const getEffectiveDueDate = (requirement) => {
  if (requirement.dueDate) return new Date(requirement.dueDate);
  if (requirement.dueInDays) return addDays(requirement.createdAt, Number(requirement.dueInDays));
  return null;
};

export const isOverdue = (requirement, now = new Date()) => {
  const due = getEffectiveDueDate(requirement);
  return due ? now > due : false;
};

// A submission is "missing" once the requirement deadline passed and nothing was turned in
export const deriveSubmissionState = (requirement, submission, now = new Date()) => {
  if (submission) {
    if (submission.status === 'APPROVED') return 'COMPLETED';
    if (submission.status === 'REJECTED') return 'REJECTED';
    if (isOverdue(requirement, now)) return 'LATE';
    return 'PENDING';
  }
  if (isOverdue(requirement, now)) return 'MISSING';
  return 'NOT_STARTED';
};

// Student's submission status across all requirements (auto-grading aware)
export const getStudentSubmissions = async (studentId) => {
  const now = new Date();
  const requirements = await prisma.requirement.findMany({
    where: { OR: [{ program: null }, { program: '' }] },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      submissions: {
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 1
      }
    }
  });

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { course: true }
  });

  const programRequirements = await prisma.requirement.findMany({
    where: { program: student?.course || '__none__' },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      submissions: {
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 1
      }
    }
  });

  const all = [...requirements, ...programRequirements].filter(
    (req, index, list) => list.findIndex((r) => r.id === req.id) === index
  );

  return all.map((r) => {
    const submission = r.submissions[0] || null;
    return {
      ...r,
      submission: submission
        ? { ...submission, derivedStatus: deriveSubmissionState(r, submission, now) }
        : null,
      derivedStatus: deriveSubmissionState(r, submission, now),
      dueDate: getEffectiveDueDate(r),
      submissions: undefined
    };
  });
};

// Admin view: all submissions, optionally filtered by requirement or status
export const getAllSubmissions = async (filters = {}) => {
  const where = {};
  if (filters.requirementId) where.requirementId = filters.requirementId;
  if (filters.status) where.status = filters.status;

  return prisma.submission.findMany({
    where,
    include: {
      requirement: { select: { id: true, title: true, maxScore: true } },
      student: { select: { firstName: true, lastName: true, studentId: true, course: true } }
    },
    orderBy: { submittedAt: 'desc' }
  });
};

export const submitFile = async (requirementId, studentId, fileName, fileData) => {
  if (!fileName || !fileData) {
    const error = new Error('File is required');
    error.status = 400;
    throw error;
  }

  const requirement = await prisma.requirement.findUnique({ where: { id: requirementId } });
  if (!requirement) {
    const error = new Error('Requirement not found');
    error.status = 404;
    throw error;
  }

  // A new upload supersedes the previous attempt for the same requirement
  await prisma.submission.deleteMany({ where: { requirementId, studentId } });

  const autoGraded = Boolean(requirement.autoGradeOnSubmit && requirement.maxScore > 0);

  const submission = await prisma.submission.create({
    data: {
      requirementId,
      studentId,
      fileName,
      fileData,
      status: autoGraded ? 'APPROVED' : 'PENDING',
      score: autoGraded ? requirement.maxScore : null,
      isAutoGraded: autoGraded,
      reviewedAt: autoGraded ? new Date() : null
    }
  });

  if (requirement.cadence === 'WEEKLY') {
    await createNextWeeklyTask(requirement, studentId);
  }

  return { ...submission, autoScoreAwarded: autoGraded ? requirement.maxScore : null };
};

// After a weekly requirement is submitted, the student automatically gets the next week's to-do
export const createNextWeeklyTask = async (requirement, studentId) => {
  const now = new Date();
  const nextWeek = addDays(startOfWeek(now), 7);
  const dueDate = requirement.dueInDays
    ? addDays(nextWeek, Number(requirement.dueInDays))
    : addDays(nextWeek, 7);

  const existing = await prisma.weeklyTask.findFirst({
    where: { studentId, requirementId: requirement.id, weekOf: nextWeek }
  });
  if (existing) return existing;

  return prisma.weeklyTask.create({
    data: {
      studentId,
      requirementId: requirement.id,
      title: requirement.title,
      description: requirement.description,
      weekOf: nextWeek,
      dueDate
    }
  });
};

export const reviewSubmission = async (submissionId, status, remarks, score, reviewer = null) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REJECTED');
    error.status = 400;
    throw error;
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { requirement: { select: { maxScore: true, autoGradeOnSubmit: true } } }
  });
  if (!submission) {
    const error = new Error('Submission not found');
    error.status = 404;
    throw error;
  }

  const data = { status, remarks, reviewedAt: new Date() };

  if (status === 'APPROVED' && submission.score == null) {
    data.score = submission.requirement?.maxScore > 0 ? submission.requirement.maxScore : 0;
  }
  if (status === 'REJECTED') {
    data.score = 0;
  }
  if (score != null && score !== '') {
    const numeric = Number(score);
    if (Number.isNaN(numeric) || numeric < 0) {
      const error = new Error('Score must be a positive number');
      error.status = 400;
      throw error;
    }
    data.score = numeric;
    data.isAutoGraded = false;
  }

  const updated = await prisma.submission.update({ where: { id: submissionId }, data });

  await recordAudit({
    userId: reviewer?.userId || null,
    userEmail: reviewer?.email || null,
    userRole: reviewer?.role || null,
    action: 'REVIEW',
    entity: 'Submission',
    entityId: submissionId,
    description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} a submission${data.score != null ? ` with a score of ${data.score}` : ''}${remarks ? ` — ${String(remarks).slice(0, 160)}` : ''}`,
    metadata: { status, score: data.score ?? null, requirementId: submission.requirementId ?? null },
  });

  return updated;
};

// Automated grading summary: per-student completion, missing deadlines, and score totals
export const getGradingSummary = async (filters = {}) => {
  const now = new Date();
  const studentWhere = {};
  if (filters.course) studentWhere.course = filters.course;
  if (filters.search) {
    studentWhere.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { studentId: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const [students, requirements] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, studentId: true, firstName: true, lastName: true, course: true, section: true },
      orderBy: { lastName: 'asc' }
    }),
    prisma.requirement.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  ]);

  const relevantRequirements = filters.requirementId
    ? requirements.filter((r) => r.id === filters.requirementId)
    : requirements;

  const submissions = await prisma.submission.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    select: { id: true, studentId: true, requirementId: true, status: true, score: true, isAutoGraded: true }
  });

  const byStudent = new Map();
  for (const submission of submissions) {
    if (!byStudent.has(submission.studentId)) byStudent.set(submission.studentId, new Map());
    byStudent.get(submission.studentId).set(submission.requirementId, submission);
  }

  const rows = students.map((student) => {
    const studentSubs = byStudent.get(student.id) || new Map();
    const applicable = relevantRequirements.filter(
      (req) => (!req.program || req.program === student.course)
    );
    const possiblePoints = applicable.reduce((sum, req) => sum + (req.maxScore || 0), 0);

    let completed = 0;
    let pending = 0;
    let rejected = 0;
    let missing = 0;
    let late = 0;
    let earnedPoints = 0;
    let autoGradedCount = 0;

    const breakdown = applicable.map((req) => {
      const submission = studentSubs.get(req.id);
      const state = deriveSubmissionState(req, submission, now);
      if (state === 'COMPLETED') completed += 1;
      if (state === 'PENDING') pending += 1;
      if (state === 'REJECTED') rejected += 1;
      if (state === 'MISSING') missing += 1;
      if (state === 'LATE') late += 1;
      if (submission?.score != null) earnedPoints += submission.score;
      if (submission?.isAutoGraded) autoGradedCount += 1;
      return { requirementId: req.id, title: req.title, maxScore: req.maxScore || 0, state, score: submission?.score ?? null, dueDate: getEffectiveDueDate(req) };
    });

    return {
      studentId: student.id,
      studentNumber: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      course: student.course,
      section: student.section,
      totalRequirements: applicable.length,
      completed,
      pending,
      rejected,
      missing,
      late,
      autoGradedCount,
      earnedPoints,
      possiblePoints,
      percentage: possiblePoints > 0 ? Math.round((earnedPoints / possiblePoints) * 100) : null,
      breakdown
    };
  });

  return {
    generatedAt: now.toISOString(),
    totals: {
      students: rows.length,
      completed: rows.reduce((s, r) => s + r.completed, 0),
      missing: rows.reduce((s, r) => s + r.missing, 0),
      pending: rows.reduce((s, r) => s + r.pending, 0),
      autoGraded: rows.reduce((s, r) => s + r.autoGradedCount, 0)
    },
    requirements: relevantRequirements.map((r) => ({ id: r.id, title: r.title, maxScore: r.maxScore || 0, program: r.program, dueDate: getEffectiveDueDate(r) })),
    rows
  };
};

// Weekly to-dos for a student
export const getStudentWeeklyTasks = async (studentId) => {
  const now = new Date();
  const tasks = await prisma.weeklyTask.findMany({
    where: { studentId },
    orderBy: [{ dueDate: 'asc' }],
    include: { requirement: { select: { id: true, title: true, templateFile: true, templateFileName: true } } }
  });

  return tasks.map((task) => {
    const overdue = task.status === 'PENDING' && task.dueDate < now;
    return { ...task, derivedStatus: overdue ? 'MISSING' : task.status };
  });
};

export const completeWeeklyTask = async (taskId, studentId) => {
  const task = await prisma.weeklyTask.findUnique({ where: { id: taskId } });
  if (!task) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }
  if (task.studentId !== studentId) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }
  return prisma.weeklyTask.update({
    where: { id: taskId },
    data: { status: 'COMPLETED', completedAt: new Date() }
  });
};
