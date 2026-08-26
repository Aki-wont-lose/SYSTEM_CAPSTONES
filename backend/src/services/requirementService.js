// src/services/requirementService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllRequirements = async () => {
  return prisma.requirement.findMany({ orderBy: { createdAt: 'asc' } });
};

export const createRequirement = async (data) => {
  if (!data.title) {
    const error = new Error('Requirement title is required');
    error.status = 400;
    throw error;
  }
  return prisma.requirement.create({ data });
};

export const updateRequirement = async (id, data) => {
  try {
    return await prisma.requirement.update({ where: { id }, data });
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

// Student's submission status across all requirements
export const getStudentSubmissions = async (studentId) => {
  const requirements = await prisma.requirement.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      submissions: {
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 1
      }
    }
  });

  return requirements.map(r => ({
    ...r,
    submission: r.submissions[0] || null,
    submissions: undefined
  }));
};

// Admin view: all submissions, optionally filtered by requirement or status
export const getAllSubmissions = async (filters = {}) => {
  const where = {};
  if (filters.requirementId) where.requirementId = filters.requirementId;
  if (filters.status) where.status = filters.status;

  return prisma.submission.findMany({
    where,
    include: {
      requirement: { select: { title: true } },
      student: { select: { firstName: true, lastName: true, studentId: true } }
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
  return prisma.submission.create({
    data: { requirementId, studentId, fileName, fileData, status: 'PENDING' }
  });
};

export const reviewSubmission = async (submissionId, status, remarks) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REJECTED');
    error.status = 400;
    throw error;
  }
  return prisma.submission.update({
    where: { id: submissionId },
    data: { status, remarks, reviewedAt: new Date() }
  });
};
