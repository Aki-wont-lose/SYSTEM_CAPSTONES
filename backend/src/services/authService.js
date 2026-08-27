// src/services/authService.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.js';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;
const RESET_TTL_MINUTES = 30;

const isDev = process.env.NODE_ENV !== 'production';

export const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

// Direct email + password login — ADMIN / COORDINATOR / SUPERVISOR.
// STUDENT must use Google/Microsoft OAuth. Same UI, role limits sidebar + API.
const PASSWORD_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERVISOR'];

export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { student: true }
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account is disabled. Contact the OJT coordinator.');
    error.status = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (!PASSWORD_ROLES.includes(user.role)) {
    const error = new Error('Students sign in with Microsoft/Google, not a password. Use the "Log in with Student Account" option.');
    error.status = 403;
    throw error;
  }

  const token = generateToken(user.id, user.email, user.role, { coordinatorCourse: user.coordinatorCourse, supervisorCompanyId: user.supervisorCompanyId });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      theme: user.theme,
      student: user.student
    }
  };
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
    message: 'If that account exists, a reset link has been generated.',
    ...(isDev ? { devResetToken: resetToken } : {})
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

const ALLOWED_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERVISOR', 'STUDENT'];
export const registerUser = async (email, password, role = 'STUDENT') => {
  const normalizedRole = role.toUpperCase();
  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    const error = new Error(`Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`);
    error.status = 400;
    throw error;
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const error = new Error('User with this email already exists');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role: normalizedRole }
  });

  return { id: user.id, email: user.email, role: user.role };
};
