// src/services/studentService.js
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './authService.js';

const prisma = new PrismaClient();

export const getAllStudents = async (filters = {}) => {
  const where = {};
  
  if (filters.ojt_status) {
    where.ojt_status = filters.ojt_status;
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
  try {
    const hashedPassword = await hashPassword(userData.password);

    // Create user first
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        role: 'STUDENT'
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

    return student;
  } catch (error) {
    // Clean up user if student creation fails
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

    // Delete will cascade to dependent records
    return prisma.student.delete({
      where: { id: studentId }
    });
  } catch (error) {
    throw error;
  }
};

export const getStudentStats = async () => {
  const total = await prisma.student.count();
  const active = await prisma.student.count({
    where: { ojt_status: 'ONGOING' }
  });
  const completed = await prisma.student.count({
    where: { ojt_status: 'COMPLETED' }
  });
  const pending = await prisma.student.count({
    where: { ojt_status: 'NOT_STARTED' }
  });

  return {
    total,
    active,
    completed,
    pending
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
