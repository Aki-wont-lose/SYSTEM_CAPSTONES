// modules/profile/service.js — profile domain (student + any user)
import { getStudentByUserId, updateStudent } from '../../services/studentService.js';
import { getMicrosoftIdentity } from '../../services/microsoftAuthService.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMyProfile = async (userId) => {
  // profilePicture column may not exist yet until db push, so don't select it to avoid crash
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, contactNumber: true, role: true, theme: true, isActive: true, createdAt: true } });
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
  // Staff self-service fields (email is the sign-in identity, so it is validated and lowercased).
  // role is intentionally absent: nobody can change their own role here, which is what protects
  // the last remaining ADMIN from locking themselves out of the admin-only pages.
  const STAFF_EDITABLE = ['firstName', 'lastName', 'contactNumber', 'email'];
  const staffUpdate = {};
  for (const field of STAFF_EDITABLE) {
    if (data[field] !== undefined) staffUpdate[field] = String(data[field] || '').trim() || null;
  }
  if (staffUpdate.email !== undefined) {
    const email = String(staffUpdate.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      const error = new Error('Enter a valid email address');
      error.status = 400;
      throw error;
    }
    const taken = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: userId } },
      select: { id: true }
    });
    if (taken) {
      const error = new Error('That email address is already used by another account');
      error.status = 409;
      throw error;
    }
    staffUpdate.email = email;
  }
  if (Object.keys(staffUpdate).length) {
    return prisma.user.update({
      where: { id: userId },
      data: staffUpdate,
      select: { id: true, email: true, firstName: true, lastName: true, contactNumber: true, role: true }
    });
  }
  // For staff (ADMIN/COORDINATOR/SUPERVISOR) - profilePicture for User not in schema yet, just skip
  if (data.profilePicture !== undefined) {
    // Staff avatar change is UI-only for now (no DB column)
    return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
  }
  return null;
};

export const getLinkedAccounts = async (userId) => {
  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, password: true } }),
    prisma.linkedAccount.findMany({
      where: { userId },
      select: { id: true, provider: true, providerId: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  return {
    accounts: accounts.map(({ id, provider, providerId, email, createdAt }) => ({ id, provider, providerId, email, linkedAt: createdAt })),
    hasPassword: !!user?.password
  };
};

export const linkMicrosoftAccount = async (userId, idToken) => {
  const identity = await getMicrosoftIdentity(idToken);

  const owner = await prisma.linkedAccount.findUnique({
    where: { provider_providerId: { provider: 'MICROSOFT', providerId: identity.providerId } }
  });
  if (owner && owner.userId !== userId) {
    const error = new Error('That Microsoft account is already linked to another SIMES user.');
    error.status = 409;
    throw error;
  }

  const emailOwner = await prisma.user.findUnique({ where: { email: identity.email }, select: { id: true } });
  if (emailOwner && emailOwner.id !== userId) {
    const error = new Error(`A SIMES account already uses ${identity.email}. Ask an admin to merge or rename it first.`);
    error.status = 409;
    throw error;
  }

  const account = await prisma.linkedAccount.upsert({
    where: { provider_providerId: { provider: 'MICROSOFT', providerId: identity.providerId } },
    create: { userId, provider: 'MICROSOFT', providerId: identity.providerId, email: identity.email },
    update: { userId, email: identity.email },
    select: { id: true, provider: true, providerId: true, email: true, createdAt: true }
  });

  return { id: account.id, provider: account.provider, providerId: account.providerId, email: account.email, linkedAt: account.createdAt };
};

export const unlinkMicrosoftAccount = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user?.password) {
    const error = new Error('Set a password first — unlinking would leave you with no way to sign in.');
    error.status = 400;
    throw error;
  }

  await prisma.linkedAccount.deleteMany({ where: { userId, provider: 'MICROSOFT' } });
  return { success: true };
};
