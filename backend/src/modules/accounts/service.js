// src/modules/accounts/service.js
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateTemporaryPassword } from '../../services/authService.js';
import {
  isValidStaffEmail,
  getStaffEmailError,
  isValidContactNumber,
  CONTACT_NUMBER_ERROR,
  STAFF_EMAIL_ERROR
} from '../../utils/staffValidation.js';
import { isSuperAdmin } from '../../middleware/auth.js';
import { studentScopeWhere } from '../../services/accessScope.js';

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

export const getAccountCounts = async (user) => {
  // Coordinator/supervisor counts must use the same course/company scope as
  // their student list, otherwise the tab badge disagrees with the table.
  const scope = user ? studentScopeWhere(user) : {};
  const students = await prisma.student.count({ where: { isArchived: false, ...scope } });

  // Staff head-counts are only meaningful to an ADMIN; everyone else gets the
  // student total (the only figure their Account Management screen shows).
  if (!user || user.role !== 'ADMIN') {
    return { students, supervisors: 0, coordinators: 0, admins: 0 };
  }

  const [supervisors, coordinators, admins] = await Promise.all([
    prisma.user.count({ where: { role: 'SUPERVISOR', isArchived: false } }),
    prisma.user.count({ where: { role: 'COORDINATOR', isArchived: false } }),
    prisma.user.count({ where: { role: 'ADMIN', isArchived: false } })
  ]);

  return { students, supervisors, coordinators, admins };
};

export const listStaff = async ({ role, search, includeInactive = true, requesterRole, requesterIsSuperAdmin = false } = {}) => {
  // Only ADMIN may browse coordinator/supervisor/admin accounts.
  if (requesterRole && requesterRole !== 'ADMIN') return [];

  const where = {};
  // Archived accounts are hidden from account management by default
  where.isArchived = false;
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

  const activeStudents = await prisma.student.findMany({
    where: { isArchived: false },
    select: { id: true, companyId: true, supervisorEmail: true }
  });

  return staff.map((member) => {
    let assignedStudents = null;
    if (member.role === 'SUPERVISOR') {
      const memberEmail = String(member.email || '').toLowerCase();
      assignedStudents = activeStudents.filter((s) => {
        const byCompany = Boolean(member.supervisorCompanyId && s.companyId === member.supervisorCompanyId);
        const byEmail = Boolean(memberEmail && s.supervisorEmail && s.supervisorEmail.toLowerCase() === memberEmail);
        return byCompany || byEmail;
      }).length;
    }
    return {
      ...member,
      isSuperAdmin: isSuperAdmin(member),
      assignedStudents
    };
  });
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
  if (normalizedContact && !isValidContactNumber(normalizedContact)) {
    const error = new Error(CONTACT_NUMBER_ERROR);
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

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { student: true }
  });
  if (existing && !existing.isArchived) {
    const error = new Error(
      existing.role === 'STUDENT'
        ? 'A student account with this email already exists'
        : 'An account with this email already exists'
    );
    error.status = 400;
    throw error;
  }

  if (!isValidStaffEmail(normalizedEmail, normalizedRole)) {
    const error = new Error(getStaffEmailError(normalizedRole));
    error.status = 400;
    throw error;
  }

  if (existing && existing.isArchived && existing.student) {
    const stId = existing.student.id;
    await prisma.submission.deleteMany({ where: { studentId: stId } });
    await prisma.attendance.deleteMany({ where: { studentId: stId } });
    await prisma.logEntry.deleteMany({ where: { studentId: stId } });
    await prisma.weeklyTask.deleteMany({ where: { studentId: stId } });
    await prisma.student.delete({ where: { id: stId } });
  }

  const accountData = {
    email: normalizedEmail,
    password: null,
    role: normalizedRole,
    isActive: true,
    isArchived: false,
    archivedAt: null,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    contactNumber: normalizedContact,
    mustChangePassword: false,
    coordinatorCourse: normalizedRole === 'COORDINATOR' ? coordinatorCourse : null,
    supervisorCompanyId: normalizedRole === 'SUPERVISOR' ? companyId : null
  };

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: accountData,
        select: staffSelect
      })
    : await prisma.user.create({
        data: accountData,
        select: staffSelect
      });

  const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();
  if (normalizedRole === 'SUPERVISOR' && companyId) {
    await prisma.student.updateMany({
      where: { companyId },
      data: {
        supervisorEmail: normalizedEmail,
        supervisorName: fullName,
        ...(normalizedContact ? { supervisorContact: normalizedContact } : {})
      }
    });
  }

  return { user, fullName, contactNumber: normalizedContact };
};

export const updateStaffAccount = async (userId, updateData, { requesterIsSuperAdmin = false, requesterId = null, requesterEmail = null } = {}) => {
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

  const isSelf = (requesterId && existing.id === requesterId) ||
    (requesterEmail && String(existing.email || '').toLowerCase() === String(requesterEmail).toLowerCase());

  // The super-admin is the top-level account: nobody - not even the super-admin
  // themselves - may disable, demote, rename or lock it out, or the system would
  // be left with no operator able to manage it. This is the "you cannot act on an
  // account ranked above (or equal to) your own" rule, enforced at the top.
  if (isSuperAdmin(existing)) {
    const blockedFields = ['role', 'isActive', 'email'].filter((field) => updateData[field] !== undefined);
    if (blockedFields.length) {
      const error = new Error('The super-admin account cannot be disabled, demoted or renamed');
      error.status = 403;
      throw error;
    }
  }

  // An administrator must never be able to deactivate its own account, or it would
  // be locked out of every route the moment the update commits (verifyToken refuses
  // an inactive account). Covers disabling and self-demotion.
  if (isSelf) {
    if (updateData.isActive !== undefined && !updateData.isActive) {
      const error = new Error('You cannot disable your own account');
      error.status = 400;
      throw error;
    }
    if (updateData.role !== undefined && String(updateData.role).toUpperCase() !== existing.role) {
      const error = new Error('You cannot change your own role');
      error.status = 400;
      throw error;
    }
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
      // Same rule as create(), so an edit can never relax what create enforces.
      // Only applied when the address actually changes: legacy accounts seeded
      // before the rule existed stay editable.
      const targetRole = updateData.role ? String(updateData.role).toUpperCase() : existing.role;
      if (!isValidStaffEmail(normalizedEmail, targetRole)) {
        const error = new Error(getStaffEmailError(targetRole));
        error.status = 400;
        throw error;
      }
    }
    data.email = normalizedEmail;
  }

  if (updateData.contactNumber !== undefined) {
    const trimmedContact = String(updateData.contactNumber || '').trim() || null;
    if (trimmedContact && !isValidContactNumber(trimmedContact)) {
      const error = new Error(CONTACT_NUMBER_ERROR);
      error.status = 400;
      throw error;
    }
    data.contactNumber = trimmedContact;
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

  const targetCompanyId = data.supervisorCompanyId !== undefined ? data.supervisorCompanyId : existing.supervisorCompanyId;
  if (nextRole === 'SUPERVISOR' && targetCompanyId) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || nextEmail;
    await prisma.student.updateMany({
      where: {
        OR: [
          { companyId: targetCompanyId },
          { supervisorEmail: { equals: nextEmail, mode: 'insensitive' } }
        ]
      },
      data: {
        companyId: targetCompanyId,
        supervisorEmail: nextEmail,
        supervisorName: fullName,
        ...(user.contactNumber ? { supervisorContact: user.contactNumber } : {})
      }
    });
  }

  return user;
};

export const batchCreateStaffAccounts = async (accounts) => {
  const results = { created: 0, failed: 0, errors: [] };

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

      await createStaffAccount({
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        coordinatorCourse: account.coordinatorCourse,
        companyId,
        contactNumber: account.contactNumber
      });

      results.created += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push(`${label}: ${err.message}`);
    }
  }

  return results;
};

export const resetAccountPassword = async (userId, { requesterIsSuperAdmin = false } = {}) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  // The super-admin is the top-level operator. A junior admin must not be able to
  // mint a temporary password for an administrator account and take it over, so
  // resetting any ADMIN account is reserved to the super-admin (mirrors
  // deleteStaffAccount's rule).
  if (existing.role === 'ADMIN' && !requesterIsSuperAdmin) {
    const error = new Error('Administrator passwords can only be reset by the super-admin');
    error.status = 403;
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

export const deleteStaffAccount = async (userId, { requesterIsSuperAdmin = false, requesterId = null, requesterEmail = null } = {}) => {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { sentMessages: true, receivedMessages: true } } }
  });
  if (!existing) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  const isSelf = (requesterId && existing.id === requesterId) ||
    (requesterEmail && String(existing.email || '').toLowerCase() === String(requesterEmail).toLowerCase());

  // The super-admin is the top-level account: it can never be archived, not even
  // by itself, so the system always keeps a top-level operator.
  if (isSuperAdmin(existing)) {
    const error = new Error('The super-admin account cannot be archived');
    error.status = 400;
    throw error;
  }

  // Nobody can archive their own account through Account Management.
  if (isSelf) {
    const error = new Error('You cannot archive your own account');
    error.status = 400;
    throw error;
  }

  // Administrator accounts are private to the super-admin. The super-admin may
  // archive the admins it created, but never its own account.
  if (existing.role === 'ADMIN') {
    if (!requesterIsSuperAdmin) {
      const error = new Error('Administrator accounts cannot be archived from Account Management');
      error.status = 400;
      throw error;
    }
    if (requesterId && existing.id === requesterId) {
      const error = new Error('You cannot archive your own administrator account');
      error.status = 400;
      throw error;
    }
  }

  // Soft-archive instead of hard delete so audit trails and history stay intact
  await prisma.user.update({
    where: { id: userId },
    data: { isArchived: true, archivedAt: new Date() }
  });
  return { success: true, archived: true };
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
