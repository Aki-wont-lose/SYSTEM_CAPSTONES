// modules/dashboard/service.js — dashboard stats aggregated from student data
import { getStudentStats } from '../../services/studentService.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getDashboardStats = getStudentStats;

export const getSupervisorDashboard = async (userId) => {
  // COORDINATOR / SUPERVISOR see same counters (scoped filtering can be added later)
  return getStudentStats();
};

export const getStudentDashboard = async (userId) => {
  const student = await prisma.student.findUnique({ where: { userId }, include: { company: true } });
  if (!student) return null;
  const attendanceCount = await prisma.attendance.count({ where: { studentId: student.id } });
  const pendingRequirements = await prisma.submission.count({ where: { studentId: student.id, status: 'PENDING' } });
  return { student, attendanceCount, pendingRequirements };
};
