// modules/profile/service.js — profile domain (student + any user)
import { getStudentByUserId, updateStudent } from '../../services/studentService.js';
import { getMicrosoftIdentity } from '../../services/microsoftAuthService.js';
import { isValidStaffEmail, STAFF_EMAIL_ERROR } from '../../utils/staffValidation.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getMyProfile = async (userId) => {
  // profilePicture column may not exist yet until db push, so don't select it to avoid crash
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, contactNumber: true, role: true, theme: true, isActive: true, createdAt: true } });
  const student = await getStudentByUserId(userId);
  let profilePicture = student?.profilePicture || null;
  if (!student && user) {
    const avatarEntry = await prisma.auditLog.findFirst({
      where: { userId, entity: 'ProfileAvatar' },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true }
    });
    if (avatarEntry?.metadata && typeof avatarEntry.metadata === 'object' && avatarEntry.metadata.profilePicture) {
      profilePicture = avatarEntry.metadata.profilePicture;
    }
  }
  return {
    user: user ? { ...user, profilePicture } : null,
    student
  };
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

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, contactNumber: true, role: true }
  });
  if (!existingUser) return null;

  // Company supervisors and OJT coordinators are not permitted to change their registered email addresses
  if (data.email !== undefined && ['SUPERVISOR', 'COORDINATOR'].includes(existingUser.role)) {
    const error = new Error('Company supervisors and OJT coordinators cannot change their registered email address');
    error.status = 403;
    throw error;
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
    // Staff sign in with this address via Microsoft, so it has to keep matching
    // the institutional rule create() enforces — otherwise a self-edit could
    // strand the account. Only enforced when the address actually changes.
    if (existingUser.email !== email && !isValidStaffEmail(email)) {
      const error = new Error(STAFF_EMAIL_ERROR);
      error.status = 400;
      throw error;
    }
    staffUpdate.email = email;
  }

  let updatedUser = existingUser;
  if (Object.keys(staffUpdate).length) {
    updatedUser = await prisma.user.update({
      where: { id: userId },
      data: staffUpdate,
      select: { id: true, email: true, firstName: true, lastName: true, contactNumber: true, role: true }
    });
  }

  // Persist staff profilePicture without duplicating records
  let profilePicture = undefined;
  if (data.profilePicture !== undefined) {
    profilePicture = data.profilePicture;
    const existingAvatar = await prisma.auditLog.findFirst({
      where: { userId, entity: 'ProfileAvatar' },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });
    if (existingAvatar) {
      await prisma.auditLog.update({
        where: { id: existingAvatar.id },
        data: { metadata: { profilePicture: data.profilePicture } }
      });
    } else {
      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: updatedUser.email,
          userRole: updatedUser.role,
          action: 'UPDATE',
          entity: 'ProfileAvatar',
          entityId: userId,
          description: 'Updated profile picture',
          metadata: { profilePicture: data.profilePicture }
        }
      });
    }
  } else {
    const existingAvatar = await prisma.auditLog.findFirst({
      where: { userId, entity: 'ProfileAvatar' },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true }
    });
    if (existingAvatar?.metadata && typeof existingAvatar.metadata === 'object' && existingAvatar.metadata.profilePicture) {
      profilePicture = existingAvatar.metadata.profilePicture;
    }
  }

  if (Object.keys(staffUpdate).length || data.profilePicture !== undefined) {
    return { ...updatedUser, ...(profilePicture !== undefined ? { profilePicture } : {}) };
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
