// src/services/studentService.js
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateTemporaryPassword } from './authService.js';

const prisma = new PrismaClient();

export const getAllStudents = async (filters = {}) => {
  const where = {};
  
  if (filters.ojt_status) {
    where.ojt_status = filters.ojt_status;
  }
  if (filters.course) {
    where.course = filters.course;
  }
  if (filters.companyId) {
    where.companyId = filters.companyId;
  }
  if (filters.supervisorEmail) {
    where.supervisorEmail = filters.supervisorEmail;
  }
  
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { studentId: { contains: filters.search } },
      { email: { contains: filters.search } }
    ];
  }

  return prisma.student.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true
        }
      },
      company: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getStudentById = async (studentId) => {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          role: true
        }
      },
      company: true,
      attendance: {
        orderBy: { date: 'desc' },
        take: 30
      }
    }
  });
};

export const getStudentByUserId = async (userId) => {
  return prisma.student.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          theme: true
        }
      },
      company: true
    }
  });
};

export const createStudent = async (studentData, userData) => {
  const generatedPassword = !userData?.password;
  const plainPassword = userData?.password || generateTemporaryPassword();
  try {
    const hashedPassword = await hashPassword(plainPassword);

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        role: 'STUDENT',
        mustChangePassword: true
      }
    });

    // Create student record
    const student = await prisma.student.create({
      data: {
        ...studentData,
        userId: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    return {
      student,
      temporaryPassword: generatedPassword ? plainPassword : null
    };
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      const err = new Error(`${field} already exists`);
      err.status = 400;
      throw err;
    }
    throw error;
  }
};

export const updateStudent = async (studentId, updateData) => {
  try {
    return prisma.student.update({
      where: { id: studentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        }
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Student not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const deleteStudent = async (studentId) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true }
    });

    if (!student) {
      const err = new Error('Student not found');
      err.status = 404;
      throw err;
    }

    // Delete student and its linked User so email/studentId can be reused
    await prisma.student.delete({
      where: { id: studentId }
    });
    // Remove the login account as well (was left orphaned before, causing "email already exists")
    try {
      await prisma.user.delete({ where: { id: student.userId } });
    } catch (_) {
      // user already gone or cascade - ignore
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const getStudentStats = async () => {
  const [total, active, completed, pending, onHold, byCourse, activeCompanies] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({
      where: { ojt_status: 'ONGOING' }
    }),
    prisma.student.count({
      where: { ojt_status: 'COMPLETED' }
    }),
    prisma.student.count({
      where: { ojt_status: 'NOT_STARTED' }
    }),
    prisma.student.count({
      where: { ojt_status: 'ON_HOLD' }
    }),
    prisma.student.groupBy({
      by: ['course'],
      _count: { _all: true },
      orderBy: { course: 'asc' }
    }),
    prisma.company.count({
      where: { status: 'ACTIVE', students: { some: {} } }
    })
  ]);

  const courses = {};
  for (const row of byCourse) {
    courses[row.course || 'Unassigned'] = row._count._all;
  }

  return {
    total,
    active,
    completed,
    pending,
    onHold,
    onTrack: total - completed,
    byCourse: courses,
    partnerCompanies: activeCompanies,
    totalStudents: total
  };
};

export const updateStudentHours = async (studentId, completedHours) => {
  try {
    return prisma.student.update({
      where: { id: studentId },
      data: {
        completedHours,
        ojt_status: completedHours >= 486 ? 'COMPLETED' : 'ONGOING'
      }
    });
  } catch (error) {
    throw error;
  }
};
