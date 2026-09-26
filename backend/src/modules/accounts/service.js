// src/modules/accounts/service.js
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateTemporaryPassword } from '../../services/authService.js';

const prisma = new PrismaClient();

const STAFF_ROLES = ['COORDINATOR', 'SUPERVISOR'];
const MANAGER_ROLES = ['ADMIN', 'COORDINATOR'];

const staffSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  coordinatorCourse: true,
  supervisorCompanyId: true,
  createdAt: true,
  supervisorCompany: { select: { id: true, name: true } },
  _count: { select: { receivedMessages: true } }
};

export const getAccountCounts = async () => {
  const [students, supervisors, coordinators, admins] = await Promise.all([
    prisma.student.count(),
    prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    prisma.user.count({ where: { role: 'COORDINATOR' } }),
    prisma.user.count({ where: { role: 'ADMIN' } })
  ]);

  return { students, supervisors, coordinators, admins };
};

export const listStaff = async ({ role, search, includeInactive = true } = {}) => {
  const where = {};
  if (role && STAFF_ROLES.includes(role)) where.role = role;
  else if (role === 'ALL') where.role = { in: [...STAFF_ROLES, 'ADMIN'] };
  else where.role = { in: STAFF_ROLES };
  if (!includeInactive) where.isActive = true;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { coordinatorCourse: { contains: search, mode: 'insensitive' } },
      { supervisorCompany: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const staff = await prisma.user.findMany({
    where,
    select: staffSelect,
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }]
  });

  const studentCounts = await prisma.student.groupBy({
    by: ['supervisorEmail'],
    _count: { _all: true }
  });
  const countByEmail = new Map(studentCounts.map((row) => [row.supervisorEmail, row._count._all]));

  return staff.map((member) => ({
    ...member,
    assignedStudents: member.role === 'SUPERVISOR' ? (countByEmail.get(member.email) || 0) : null
  }));
};

export const createStaffAccount = async ({ email, firstName, lastName, role, coordinatorCourse, companyId, contactNumber }) => {
  const normalizedRole = String(role || '').toUpperCase();
  if (!STAFF_ROLES.includes(normalizedRole)) {
    const error = new Error('Role must be COORDINATOR or SUPERVISOR');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.status = 400;
    throw error;
  }

  if (normalizedRole === 'COORDINATOR' && !coordinatorCourse) {
    const error = new Error('Assigned course is required for a coordinator');
    error.status = 400;
    throw error;
  }
  if (normalizedRole === 'SUPERVISOR' && !companyId) {
    const error = new Error('Assigned company is required for a supervisor');
    error.status = 400;
    throw error;
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.status = 400;
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(temporaryPassword);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      isActive: true,
      mustChangePassword: true,
      coordinatorCourse: normalizedRole === 'COORDINATOR' ? coordinatorCourse : null,
      supervisorCompanyId: normalizedRole === 'SUPERVISOR' ? companyId : null
    },
    select: staffSelect
  });

  return { user, temporaryPassword, fullName: [firstName, lastName].filter(Boolean).join(' ').trim(), contactNumber: contactNumber || null };
};

export const updateStaffAccount = async (userId, updateData) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }
  if (!STAFF_ROLES.includes(existing.role) && existing.role !== 'ADMIN') {
    const error = new Error('Only coordinator and supervisor accounts can be edited here');
    error.status = 400;
    throw error;
  }

  const data = {};
  if (updateData.isActive !== undefined) data.isActive = Boolean(updateData.isActive);
  if (updateData.coordinatorCourse !== undefined) {
    data.coordinatorCourse = updateData.coordinatorCourse || null;
  }
  if (updateData.supervisorCompanyId !== undefined) {
    data.supervisorCompanyId = updateData.supervisorCompanyId || null;
  }

  const user = await prisma.user.update({ where: { id: userId }, data, select: staffSelect });

  if (existing.role === 'SUPERVISOR' && updateData.supervisorCompanyId && updateData.supervisorCompanyId !== existing.supervisorCompanyId) {
    await prisma.student.updateMany({
      where: { supervisorEmail: existing.email },
      data: { companyId: updateData.supervisorCompanyId }
    });
  }

  return user;
};

export const resetAccountPassword = async (userId) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(temporaryPassword);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword, mustChangePassword: true, resetToken: null, resetTokenExpiresAt: null },
    select: staffSelect
  });

  return { user, temporaryPassword };
};

export const deleteStaffAccount = async (userId) => {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { sentMessages: true, receivedMessages: true } } }
  });
  if (!existing) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }
  if (existing.role === 'ADMIN') {
    const error = new Error('Administrator accounts cannot be removed from Account Management');
    error.status = 400;
    throw error;
  }

  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
};

export const getAccountById = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: staffSelect });
  if (!user) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }
  return user;
};

export const accountManagerRoles = MANAGER_ROLES;
