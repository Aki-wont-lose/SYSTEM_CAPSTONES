// modules/ojtHours/service.js - admin-maintained required OJT hours per course
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getOjtHours = async () => {
  return prisma.ojtHoursConfig.findMany({
    orderBy: { course: 'asc' },
    select: { id: true, course: true, requiredHours: true, createdAt: true, updatedAt: true }
  });
};

export const updateOjtHours = async (course, requiredHours) => {
  if (!course || requiredHours === undefined || requiredHours === null) {
    const e = new Error('Course and requiredHours are required');
    e.status = 400;
    throw e;
  }
  const hours = Number(requiredHours);
  if (!Number.isInteger(hours) || hours < 1) {
    const e = new Error('requiredHours must be a positive integer');
    e.status = 400;
    throw e;
  }
  return prisma.ojtHoursConfig.upsert({
    where: { course },
    update: { requiredHours: hours },
    create: { course, requiredHours: hours },
    select: { id: true, course: true, requiredHours: true }
  });
};

export const getOjtHoursByCourse = async (course) => {
  return prisma.ojtHoursConfig.findUnique({
    where: { course },
    select: { requiredHours: true }
  });
};
