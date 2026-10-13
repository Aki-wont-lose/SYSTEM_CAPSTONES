// src/modules/accounts/service.js
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateTemporaryPassword } from '../../services/authService.js';

const prisma = new PrismaClient();

const STAFF_ROLES = ['COORDINATOR', 'SUPERVISOR'];
const EDITABLE_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERVISOR'];
const MANAGER_ROLES = ['ADMIN', 'COORDINATOR'];

const staffSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  contactNumber: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  coordinatorCourse: true,
  supervisorCompanyId: true,
  createdAt: true,
  supervisorCompany: { select: { id: true, name: true } },
  _count: { select: { receivedMessages: true } }
};

export const getAccountCounts = async (requesterRole) => {
  const students = await prisma.student.count();

  // Staff head-counts are only meaningful to an ADMIN; everyone else gets the
  // student total (the only figure their Account Management screen shows).
  if (requesterRole !== 'ADMIN') {
    return { students, supervisors: 0, coordinators: 0, admins: 0 };
  }

  const [supervisors, coordinators, admins] = await Promise.all([
    prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    prisma.user.count({ where: { role: 'COORDINATOR' } }),
    prisma.user.count({ where: { role: 'ADMIN' } })
  ]);

  return { students, supervisors, coordinators, admins };
};

export const listStaff = async ({ role, search, includeInactive = true, requesterRole, requesterIsSuperAdmin = false } = {}) => {
  // Only ADMIN may browse coordinator/supervisor/admin accounts.
  if (requesterRole && requesterRole !== 'ADMIN') return [];

  const where = {};
  if (role === 'ADMIN') {
    // Administrator accounts are private to the super-admin.
    if (!requesterIsSuperAdmin) return [];
    where.role = 'ADMIN';
  } else if (role && STAFF_ROLES.includes(role)) where.role = role;
  else if (role === 'ALL') where.role = { in: [...STAFF_ROLES, 'ADMIN'] };
  else where.role = { in: STAFF_ROLES };
  if (!includeInactive) where.isActive = true;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { contactNumber: { contains: search } },
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

export const createStaffAccount = async ({ email, firstName, lastName, role, coordinatorCourse, companyId, contactNumber, requesterIsSuperAdmin = false }) => {
  const normalizedRole = String(role || '').toUpperCase();
  // Only the super-admin may create another ADMIN. Everyone else is confined to
  // the coordinator/supervisor roles the Add form exposes to them.
  if (normalizedRole === 'ADMIN' && !requesterIsSuperAdmin) {
    const error = new Error('Only the super-admin can create administrator accounts');
    error.status = 403;
    throw error;
  }
  if (!STAFF_ROLES.includes(normalizedRole) && !(requesterIsSuperAdmin && normalizedRole === 'ADMIN')) {
    const error = new Error(requesterIsSuperAdmin ? 'Role must be ADMIN, COORDINATOR or SUPERVISOR' : 'Role must be COORDINATOR or SUPERVISOR');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.status = 400;
    throw error;
  }

  const normalizedFirstName = String(firstName || '').trim();
  const normalizedLastName = String(lastName || '').trim();
  if (!normalizedFirstName || !normalizedLastName) {
    const error = new Error('First name and last name are required');
    error.status = 400;
    throw error;
  }
  const normalizedContact = String(contactNumber || '').trim() || null;

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
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      contactNumber: normalizedContact,
      mustChangePassword: true,
      coordinatorCourse: normalizedRole === 'COORDINATOR' ? coordinatorCourse : null,
      supervisorCompanyId: normalizedRole === 'SUPERVISOR' ? companyId : null
    },
    select: staffSelect
  });

  return { user, temporaryPassword, fullName: `${normalizedFirstName} ${normalizedLastName}`, contactNumber: normalizedContact };
};

export const updateStaffAccount = async (userId, updateData, { requesterIsSuperAdmin = false } = {}) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }
  if (!STAFF_ROLES.includes(existing.role) && existing.role !== 'ADMIN') {
    const error = new Error('Only admin, coordinator and supervisor accounts can be edited here');
    error.status = 400;
    throw error;
  }
  // Administrator accounts are managed by the super-admin only, so a co-admin
  // cannot disable, demote or rename them.
  if (existing.role === 'ADMIN' && !requesterIsSuperAdmin) {
    const error = new Error('Only the super-admin can manage administrator accounts');
    error.status = 403;
    throw error;
  }

  const data = {};

  if (updateData.email !== undefined) {
    const normalizedEmail = String(updateData.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      const error = new Error('Email is required');
      error.status = 400;
      throw error;
    }
    if (normalizedEmail !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (duplicate) {
        const error = new Error('An account with this email already exists');
        error.status = 400;
        throw error;
      }
    }
    data.email = normalizedEmail;
  }

  if (updateData.role !== undefined) {
    const normalizedRole = String(updateData.role || '').toUpperCase();
    if (!EDITABLE_ROLES.includes(normalizedRole)) {
      const error = new Error('Role must be ADMIN, COORDINATOR or SUPERVISOR');
      error.status = 400;
      throw error;
    }
    // Promoting an account to ADMIN is a super-admin-only action.
    if (normalizedRole === 'ADMIN' && !requesterIsSuperAdmin) {
      const error = new Error('Only the super-admin can grant the administrator role');
      error.status = 403;
      throw error;
    }
    data.role = normalizedRole;
  }

  const nextRole = data.role || existing.role;

  if (updateData.isActive !== undefined) data.isActive = Boolean(updateData.isActive);
  if (updateData.firstName !== undefined) data.firstName = String(updateData.firstName || '').trim() || null;
  if (updateData.lastName !== undefined) data.lastName = String(updateData.lastName || '').trim() || null;
  if (updateData.contactNumber !== undefined) data.contactNumber = String(updateData.contactNumber || '').trim() || null;
  if (updateData.coordinatorCourse !== undefined) {
    data.coordinatorCourse = String(updateData.coordinatorCourse || '').trim().toUpperCase() || null;
  }
  if (updateData.supervisorCompanyId !== undefined) {
    data.supervisorCompanyId = updateData.supervisorCompanyId || null;
  }

  if (nextRole === 'COORDINATOR' && !(data.coordinatorCourse ?? existing.coordinatorCourse)) {
    const error = new Error('Assigned course is required for a coordinator');
    error.status = 400;
    throw error;
  }
  if (nextRole === 'SUPERVISOR' && !(data.supervisorCompanyId ?? existing.supervisorCompanyId)) {
    const error = new Error('Assigned company is required for a supervisor');
    error.status = 400;
    throw error;
  }

  if (nextRole !== 'COORDINATOR') data.coordinatorCourse = null;
  if (nextRole !== 'SUPERVISOR') data.supervisorCompanyId = null;

  const user = await prisma.user.update({ where: { id: userId }, data, select: staffSelect });

  const nextEmail = data.email || existing.email;
  if (nextEmail !== existing.email) {
    await prisma.student.updateMany({ where: { supervisorEmail: existing.email }, data: { supervisorEmail: nextEmail } });
  }

  if (existing.role === 'SUPERVISOR' && updateData.supervisorCompanyId && updateData.supervisorCompanyId !== existing.supervisorCompanyId) {
    await prisma.student.updateMany({
      where: { supervisorEmail: nextEmail },
      data: { companyId: updateData.supervisorCompanyId }
    });
  }

  return user;
};

export const batchCreateStaffAccounts = async (accounts) => {
  const results = { created: 0, failed: 0, errors: [], credentials: [] };

  for (const account of accounts) {
    const label = account.email || 'unknown row';
    try {
      if (!account.firstName || !account.lastName || !account.email || !account.role) {
        results.failed += 1;
        results.errors.push(`${label}: firstName, lastName, email and role are required`);
        continue;
      }

      let companyId = account.companyId || null;
      if (String(account.role).toUpperCase() === 'SUPERVISOR' && !companyId && account.companyName) {
        const company = await prisma.company.findFirst({
          where: { name: { equals: String(account.companyName).trim(), mode: 'insensitive' } }
        });
        if (!company) {
          results.failed += 1;
          results.errors.push(`${label}: company "${account.companyName}" not found`);
          continue;
        }
        companyId = company.id;
      }

      const result = await createStaffAccount({
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        coordinatorCourse: account.coordinatorCourse,
        companyId,
        contactNumber: account.contactNumber
      });

      results.created += 1;
      if (result.temporaryPassword) {
        results.credentials.push({
          email: result.user.email,
          fullName: result.fullName,
          contactNumber: result.contactNumber,
          temporaryPassword: result.temporaryPassword
        });
      }
    } catch (err) {
      results.failed += 1;
      results.errors.push(`${label}: ${err.message}`);
    }
  }

  return results;
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
