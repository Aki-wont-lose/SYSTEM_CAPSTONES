// modules/profile/service.js — profile domain (student + any user)
import { getStudentByUserId, updateStudent } from '../../services/studentService.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMyProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, theme: true, isActive: true, createdAt: true } });
  const student = await getStudentByUserId(userId);
  return { user, student };
};

export const updateMyProfile = async (userId, data) => {
  const student = await getStudentByUserId(userId);
  if (!student) return null;
  const SELF_EDITABLE = ['course','section','email','contactNumber'];
  const updateData = {};
  for (const f of SELF_EDITABLE) if (data[f] !== undefined) updateData[f] = data[f];
  return updateStudent(student.id, updateData);
};
