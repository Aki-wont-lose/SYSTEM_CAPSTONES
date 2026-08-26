// src/services/logEntryService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getStudentLogs = async (studentId) => {
  return prisma.logEntry.findMany({
    where: { studentId },
    orderBy: { date: 'desc' }
  });
};

export const getAllLogs = async (filters = {}) => {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.studentId) where.studentId = filters.studentId;

  return prisma.logEntry.findMany({
    where,
    include: { student: { select: { firstName: true, lastName: true, studentId: true } } },
    orderBy: { date: 'desc' }
  });
};

export const createLog = async (studentId, date, taskDescription) => {
  if (!taskDescription) {
    const error = new Error('Task description is required');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.create({
    data: { studentId, date: new Date(date), taskDescription, status: 'PENDING' }
  });
};

// Admin assigns a task to a student (creates a log entry on their behalf)
export const assignTask = async (studentId, date, taskDescription, assignedBy) => {
  return prisma.logEntry.create({
    data: { studentId, date: new Date(date), taskDescription, assignedBy, status: 'PENDING' }
  });
};

export const updateLog = async (id, studentId, taskDescription) => {
  const log = await prisma.logEntry.findUnique({ where: { id } });
  if (!log) {
    const error = new Error('Log entry not found');
    error.status = 404;
    throw error;
  }
  if (log.studentId !== studentId) {
    const error = new Error('Not authorized to edit this log');
    error.status = 403;
    throw error;
  }
  if (log.status === 'APPROVED') {
    const error = new Error('Approved logs cannot be edited');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.update({
    where: { id },
    data: { taskDescription }
  });
};

export const reviewLog = async (id, status, comment) => {
  if (!['APPROVED', 'REVISION_REQUESTED'].includes(status)) {
    const error = new Error('Status must be APPROVED or REVISION_REQUESTED');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.update({
    where: { id },
    data: { status, comment }
  });
};

export const deleteLog = async (id, studentId) => {
  const log = await prisma.logEntry.findUnique({ where: { id } });
  if (!log) {
    const error = new Error('Log entry not found');
    error.status = 404;
    throw error;
  }
  if (log.studentId !== studentId) {
    const error = new Error('Not authorized to delete this log');
    error.status = 403;
    throw error;
  }
  if (log.status === 'APPROVED') {
    const error = new Error('Approved logs cannot be deleted');
    error.status = 400;
    throw error;
  }
  return prisma.logEntry.delete({ where: { id } });
};
