// modules/archive/service.js - list and restore soft-archived records
import { PrismaClient } from '@prisma/client';
import { canAccessStudent } from '../../services/accessScope.js';

const prisma = new PrismaClient();

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

// Archived records are still in the database; this never hard-deletes them.
export const getArchivedRecords = async (user) => {
  const isAdmin = user?.role === 'ADMIN';
  const isCoordinator = user?.role === 'COORDINATOR';

  const studentScope = isAdmin
    ? {}
    : isCoordinator && user.coordinatorCourse
      ? { course: user.coordinatorCourse }
      : { id: '__no_access__' };

  const students = await prisma.student.findMany({
    where: { isArchived: true, ...studentScope },
    include: {
      user: { select: { email: true } },
      company: { select: { name: true } }
    },
    orderBy: { archivedAt: 'desc' }
  });

  let coordinators = [];
  if (isAdmin) {
    coordinators = await prisma.user.findMany({
      where: { isArchived: true, role: 'COORDINATOR' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        coordinatorCourse: true,
        isActive: true,
        archivedAt: true
      },
      orderBy: { archivedAt: 'desc' }
    });
  }

  const companies = isAdmin || isCoordinator
    ? await prisma.company.findMany({
        where: { isArchived: true },
        include: { _count: { select: { students: true } } },
        orderBy: { archivedAt: 'desc' }
      })
    : [];

  return { students, coordinators, companies };
};

export const restoreStudent = async (studentId, user) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      userId: true,
      course: true,
      companyId: true,
      supervisorEmail: true,
      isArchived: true
    }
  });

  if (!student) throw notFound('Student not found');
  if (!canAccessStudent(user, student)) {
    const error = new Error('You do not have access to this record.');
    error.status = 403;
    throw error;
  }
  if (!student.isArchived) return { success: true, restored: false };

  await prisma.student.update({
    where: { id: studentId },
    data: { isArchived: false, archivedAt: null }
  });

  // The linked login was archived together with the student; bring it back too.
  try {
    await prisma.user.update({
      where: { id: student.userId },
      data: { isArchived: false, archivedAt: null }
    });
  } catch {
    // Login row already gone - the student record is still restored.
  }

  return { success: true, restored: true };
};

export const restoreCoordinator = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isArchived: true }
  });

  if (!user || user.role !== 'COORDINATOR') throw notFound('Coordinator account not found');
  if (!user.isArchived) return { success: true, restored: false };

  await prisma.user.update({
    where: { id: userId },
    data: { isArchived: false, archivedAt: null }
  });

  return { success: true, restored: true };
};

export const restoreCompany = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, isArchived: true }
  });

  if (!company) throw notFound('Company not found');
  if (!company.isArchived) return { success: true, restored: false };

  await prisma.company.update({
    where: { id: companyId },
    data: { isArchived: false, archivedAt: null, status: 'ACTIVE' }
  });

  return { success: true, restored: true };
};
