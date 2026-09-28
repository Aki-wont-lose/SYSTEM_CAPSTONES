// src/services/authService.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.js';
import { recordAudit } from './auditLogService.js';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const RESET_TTL_MINUTES = 30;

export const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const TEMP_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMP_LOWER = 'abcdefghijkmnopqrstuvwxyz';
const TEMP_DIGITS = '23456789';
const TEMP_SYMBOLS = '!@#$%&*?';

const pickFrom = (set) => set[crypto.randomInt(0, set.length)];

export const generateTemporaryPassword = () => {
  const required = [pickFrom(TEMP_UPPER), pickFrom(TEMP_LOWER), pickFrom(TEMP_DIGITS), pickFrom(TEMP_SYMBOLS)];
  const all = TEMP_UPPER + TEMP_LOWER + TEMP_DIGITS;
  while (required.length < 10) required.push(pickFrom(all));
  for (let i = required.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }
  return required.join('');
};

export const loginUser = async (email, password) => {
  // Case-insensitive so changing your own email in Profile can never lock you out of sign-in
  const user = await prisma.user.findFirst({
    where: { email: { equals: String(email || '').trim(), mode: 'insensitive' } },
    include: { student: true }
  });

  if (!user) {
    await recordAudit({ userEmail: email, action: 'LOGIN_FAILED', entity: 'Account', description: `Failed sign-in attempt for ${email}` });
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (!user.isActive) {
    await recordAudit({ userId: user.id, userEmail: user.email, userRole: user.role, action: 'LOGIN_FAILED', entity: 'Account', description: `Sign-in blocked for a disabled account (${user.email})` });
    const error = new Error('Account is disabled. Contact the OJT coordinator.');
    error.status = 403;
    throw error;
  }

  if (!user.password) {
    const error = new Error('This account has no password yet. Sign in with Microsoft instead.');
    error.status = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    await recordAudit({ userId: user.id, userEmail: user.email, userRole: user.role, action: 'LOGIN_FAILED', entity: 'Account', description: `Wrong password for ${user.email}` });
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  await recordAudit({ userId: user.id, userEmail: user.email, userRole: user.role, action: 'LOGIN', entity: 'Account', description: `Signed in with email and password (${user.email})` });

  const token = generateToken(user.id, user.email, user.role, { coordinatorCourse: user.coordinatorCourse, supervisorCompanyId: user.supervisorCompanyId });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      theme: user.theme,
      mustChangePassword: user.mustChangePassword,
      coordinatorCourse: user.coordinatorCourse,
      supervisorCompanyId: user.supervisorCompanyId,
      student: user.student
    }
  };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  if (!newPassword || newPassword.length < 8) {
    const error = new Error('New password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  if (user.password) {
    const matches = await bcrypt.compare(currentPassword || '', user.password);
    if (!matches) {
      const error = new Error('Current password is incorrect');
      error.status = 400;
      throw error;
    }
  }

  if (user.password && currentPassword === newPassword) {
    const error = new Error('New password must be different from the current password');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      resetToken: null,
      resetTokenExpiresAt: null
    }
  });

  return { success: true, message: 'Password updated successfully' };
};

export const requestPasswordReset = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Do not reveal whether the account exists
    return { message: 'If that account exists, a reset link has been generated.' };
  }

  const resetToken = crypto.randomBytes(24).toString('hex');
  const resetTokenExpiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiresAt }
  });

  console.log(`\n🔑 Password reset token for ${email}: ${resetToken} (expires in ${RESET_TTL_MINUTES} min)\n`);

  return {
    // SECURITY: the reset token is NEVER returned in the HTTP response. Returning it
    // (even "just" in development) handed anyone who could reach
    // /api/auth/forgot-password a valid token for ANY account, including ADMIN.
    // Delivery is out-of-band only.
    message: 'If that account exists, a reset link has been generated.'
  };
};

export const resetPassword = async (resetToken, newPassword) => {
  const user = await prisma.user.findFirst({ where: { resetToken } });

  if (!user || !user.resetTokenExpiresAt || new Date() > user.resetTokenExpiresAt) {
    const error = new Error('Reset link is invalid or has expired.');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      resetToken: null,
      resetTokenExpiresAt: null
    }
  });

  return { message: 'Password has been reset successfully.' };
};

export const updateUserTheme = async (userId, theme) => {
  return prisma.user.update({
    where: { id: userId },
    data: { theme }
  });
};
