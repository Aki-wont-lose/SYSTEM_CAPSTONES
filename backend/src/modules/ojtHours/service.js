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
  if (!Number.isInteger(hours) || hours < 1 || hours > 2000) {
    const e = new Error('requiredHours must be a whole number between 1 and 2000');
    e.status = 400;
    throw e;
  }

  // Pull the previous default so existing students who are still on it pick up
  // the new value, while a per-student manual override is left untouched.
  const previous = await prisma.ojtHoursConfig.findUnique({
    where: { course },
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
        course,
        isArchived: false,
        ...(previous ? { requiredHours: previous.requiredHours } : {})
      },
      data: { requiredHours: hours }
    })
  ]);

  return config;
};

export const getOjtHoursByCourse = async (course) => {
  return prisma.ojtHoursConfig.findUnique({
    where: { course },
    select: { requiredHours: true }
  });
};
