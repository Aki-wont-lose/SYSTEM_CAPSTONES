// modules/profile/service.js — profile domain (student + any user)
import { getStudentByUserId, updateStudent } from '../../services/studentService.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMyProfile = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, theme: true, isActive: true, createdAt: true, profilePicture: true } });
  const student = await getStudentByUserId(userId);
  return { user, student };
};

export const updateMyProfile = async (userId, data) => {
  // If student exists, update student (for STUDENT) including profilePicture
  const student = await getStudentByUserId(userId);
  if (student) {
    const SELF_EDITABLE = ['course','section','email','contactNumber','profilePicture'];
    const updateData = {};
    for (const f of SELF_EDITABLE) if (data[f] !== undefined) updateData[f] = data[f];
    // also allow profilePicture for student even if not in selfie? handle separately
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
    if (Object.keys(updateData).length) return updateStudent(student.id, updateData);
    return student;
  }
  // For staff (ADMIN/COORDINATOR/SUPERVISOR) update User profilePicture
  if (data.profilePicture !== undefined) {
    return prisma.user.update({ where: { id: userId }, data: { profilePicture: data.profilePicture } });
  }
  return null;
};
