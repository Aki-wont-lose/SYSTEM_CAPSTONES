// src/modules/accounts/service.js
import prisma from '../../utils/prisma.js';
import { hashPassword, generateTemporaryPassword } from '../../services/authService.js';
import {
  isValidStaffEmail,
  getStaffEmailError,
  isValidPersonName,
  isValidContactNumber,
  PERSON_NAME_ERROR,
  CONTACT_NUMBER_ERROR,
  STAFF_EMAIL_ERROR
} from '../../utils/staffValidation.js';
import { isSuperAdmin, invalidateUserAuthCache } from '../../middleware/auth.js';
import { studentScopeWhere } from '../../services/accessScope.js';
import { SUPPORTED_PROGRAMS, normalizeCourseCode } from '../../utils/studentValidation.js';
import { verifySchoolAccountForCreation } from '../../services/graphDirectoryService.js';
import { isSchoolAccountRole, roleEmailError } from '../../services/microsoftAccountPolicy.js';
import { recordAudit } from '../../services/auditLogService.js';


const STAFF_ROLES = ['COORDINATOR', 'SUPERVISOR'];
const EDITABLE_ROLES = ['ADMIN', 'COORDINATOR', 'SUPERVISOR'];
const MANAGER_ROLES = ['ADMIN', 'COORDINATOR'];
const SUPERVISOR_APPROVAL_ENTITY = 'SupervisorApprovalRequest';

const normalizeCoordinatorSections = (value) => {
  if (value == null) return [];
  const rawList = Array.isArray(value) ? value : String(value).split(/[,;|]+/);
  const seen = new Set();
  const result = [];
  for (const item of rawList) {
    const clean = String(item || '').trim().toUpperCase();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
};

const syncStudentsForCoordinator = async (coordinatorId, course, sections = []) => {
  if (!coordinatorId || !course) return;
  const normalizedCourse = normalizeCourseCode(course);
  const courseVariants = normalizedCourse === 'ACT' ? ['ACT', 'BSACT', 'BSAC'] : [normalizedCourse];
  const normalizedSections = normalizeCoordinatorSections(sections);

  // Clear previous assignments pointing to this coordinator that no longer match
  await prisma.student.updateMany({
    where: { coordinatorId },
    data: { coordinatorId: null }
  });

  if (normalizedSections.length > 0) {
    await prisma.student.updateMany({
      where: {
        isArchived: false,
        course: { in: courseVariants },
        OR: normalizedSections.map((sec) => ({ section: { equals: sec, mode: 'insensitive' } }))
      },
      data: { coordinatorId }
    });
  }
};

const getSupervisorApprovalMap = async (supervisorIds = []) => {
  const map = new Map();
  if (!Array.isArray(supervisorIds) || supervisorIds.length === 0) return map;
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: SUPERVISOR_APPROVAL_ENTITY,
        entityId: { in: supervisorIds }
      },
      orderBy: { createdAt: 'desc' }
    });
    for (const log of logs) {
      if (log.entityId && !map.has(log.entityId) && log.metadata && typeof log.metadata === 'object') {
        map.set(log.entityId, log.metadata);
      }
    }
  } catch (err) {
    console.warn('[accounts] Failed to load supervisor approval logs:', err.message);
  }
  return map;
};

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
  coordinatorSections: true,
  supervisorCompanyId: true,
  createdAt: true,
  supervisorCompany: { select: { id: true, name: true } },
  linkedAccounts: {
    where: { provider: 'MICROSOFT' },
    select: { email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 1
  },
  _count: { select: { receivedMessages: true } }
};

export const getAccountCounts = async (user) => {
  // Coordinator/supervisor counts must use the same course/company scope as
  // their student list, otherwise the tab badge disagrees with the table.
  const scope = user ? studentScopeWhere(user) : {};
  const isElevated = user && (user.role === 'ADMIN' || user.role === 'COORDINATOR');

  if (!isElevated) {
    const students = await prisma.student.count({ where: { isArchived: false, ...scope } });
    return { students, supervisors: 0, pendingSupervisors: 0, coordinators: 0, admins: 0 };
  }

  const [students, allSupervisors, coordinators, admins] = await Promise.all([
    prisma.student.count({ where: { isArchived: false, ...scope } }),
    prisma.user.findMany({
      where: { role: 'SUPERVISOR', isArchived: false },
      select: { id: true, isActive: true }
    }),
    user.role === 'ADMIN'
      ? prisma.user.count({ where: { role: 'COORDINATOR', isArchived: false } })
      : Promise.resolve(0),
    user.role === 'ADMIN'
      ? prisma.user.count({ where: { role: 'ADMIN', isArchived: false } })
      : Promise.resolve(0)
  ]);

  const approvalMap = await getSupervisorApprovalMap(allSupervisors.map((s) => s.id));
  const pendingSupervisors = allSupervisors.filter((s) => {
    const meta = approvalMap.get(s.id);
    return meta?.status === 'PENDING' || (!s.isActive && meta?.status !== 'REJECTED');
  }).length;

  return {
    students,
    supervisors: allSupervisors.length,
    pendingSupervisors,
    coordinators,
    admins
  };
};

export const listStaff = async ({ role, search, includeInactive = true, requesterRole, requesterIsSuperAdmin = false } = {}) => {
  // ADMIN can browse staff accounts; COORDINATOR can browse SUPERVISOR accounts to submit & monitor requests.
  if (requesterRole && requesterRole !== 'ADMIN') {
    if (requesterRole === 'COORDINATOR' && role === 'SUPERVISOR') {
      // Allowed: Coordinator viewing OJT Supervisor accounts and request statuses
    } else {
      return [];
    }
  }

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

  const supervisorIds = staff.filter((m) => m.role === 'SUPERVISOR').map((m) => m.id);
  const [activeStudents, approvalMap] = supervisorIds.length > 0
    ? await Promise.all([
        prisma.student.findMany({
          where: { isArchived: false },
          select: { id: true, companyId: true, supervisorEmail: true }
        }),
        getSupervisorApprovalMap(supervisorIds)
      ])
    : [[], new Map()];

  return staff.map((member) => {
    let assignedStudents = null;
    let approvalStatus = null;
    let approvalMetadata = null;
    if (member.role === 'SUPERVISOR') {
      const memberEmail = String(member.email || '').toLowerCase();
      assignedStudents = activeStudents.filter((s) => {
        const byCompany = Boolean(member.supervisorCompanyId && s.companyId === member.supervisorCompanyId);
        const byEmail = Boolean(memberEmail && s.supervisorEmail && s.supervisorEmail.toLowerCase() === memberEmail);
        return byCompany || byEmail;
      }).length;
      const meta = approvalMap.get(member.id) || null;
      approvalMetadata = meta;
      if (meta?.status) {
        approvalStatus = meta.status;
      } else {
        approvalStatus = member.isActive ? 'APPROVED' : 'PENDING';
      }
    }
    const { linkedAccounts = [], ...rest } = member;
    return {
      ...rest,
      coordinatorCourse: rest.coordinatorCourse ? normalizeCourseCode(rest.coordinatorCourse) : null,
      isSuperAdmin: isSuperAdmin(member),
      assignedStudents,
      approvalStatus,
      approvalMetadata
    };
  });
};

export const createStaffAccount = async ({
  email,
  firstName,
  lastName,
  role,
  coordinatorCourse,
  coordinatorSections,
  companyId,
  contactNumber,
  requesterIsSuperAdmin = false,
  requesterRole = 'ADMIN',
  requesterId = null,
  requesterEmail = null,
  requesterCourse = null
}) => {
  const normalizedRole = String(role || '').toUpperCase();

  // Requirement 1: Super Admin must not be able to directly create company / OJT Supervisor accounts.
  if (normalizedRole === 'SUPERVISOR' && requesterIsSuperAdmin) {
    const error = new Error(
      'Super Admin is restricted from directly creating OJT Supervisor / company accounts. Supervisor account requests must be submitted by an OJT Coordinator.'
    );
    error.status = 403;
    throw error;
  }

  // Requirement 5A: The OJT Coordinator is responsible for creating OJT Supervisor account requests.
  if (requesterRole === 'COORDINATOR' && normalizedRole !== 'SUPERVISOR') {
    const error = new Error('OJT Coordinators are only authorized to create OJT Supervisor account requests.');
    error.status = 403;
    throw error;
  }
  if (normalizedRole === 'SUPERVISOR' && requesterRole !== 'COORDINATOR') {
    const error = new Error('OJT Supervisor account requests must be created by an OJT Coordinator and approved by an Administrator.');
    error.status = 403;
    throw error;
  }

  // Only the super-admin may create another ADMIN.
  if (normalizedRole === 'ADMIN' && !requesterIsSuperAdmin) {
    const error = new Error('Only the super-admin can create administrator accounts');
    error.status = 403;
    throw error;
  }
  if (!STAFF_ROLES.includes(normalizedRole) && !(requesterIsSuperAdmin && normalizedRole === 'ADMIN')) {
    const error = new Error(requesterIsSuperAdmin ? 'Role must be ADMIN or COORDINATOR' : 'Role must be COORDINATOR or SUPERVISOR');
    error.status = 400;
    throw error;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    const error = new Error('Email is required');
    error.status = 400;
    throw error;
  }

  const normalizedFirstName = String(firstName || '').trim().replace(/\s+/g, ' ');
  const normalizedLastName = String(lastName || '').trim().replace(/\s+/g, ' ');
  if (!normalizedFirstName || !normalizedLastName) {
    const error = new Error('First name and last name are required');
    error.status = 400;
    throw error;
  }
  if (!isValidPersonName(normalizedFirstName) || !isValidPersonName(normalizedLastName)) {
    const error = new Error(PERSON_NAME_ERROR);
    error.status = 400;
    throw error;
  }
  const normalizedContact = String(contactNumber || '').trim() || null;
  if (normalizedRole === 'SUPERVISOR' && !normalizedContact) {
    const error = new Error('Contact number is required when requesting an OJT Supervisor account');
    error.status = 400;
    throw error;
  }
  if (normalizedContact && !isValidContactNumber(normalizedContact)) {
    const error = new Error(CONTACT_NUMBER_ERROR);
    error.status = 400;
    throw error;
  }

  const normalizedCourse = normalizedRole === 'COORDINATOR'
    ? normalizeCourseCode(coordinatorCourse)
    : null;
  const normalizedSections = normalizedRole === 'COORDINATOR'
    ? normalizeCoordinatorSections(coordinatorSections)
    : [];
  if (normalizedRole === 'COORDINATOR' && !normalizedCourse) {
    const error = new Error('Assigned course is required for a coordinator');
    error.status = 400;
    throw error;
  }
  if (normalizedCourse && !SUPPORTED_PROGRAMS.includes(normalizedCourse)) {
    const error = new Error(`Course must be one of: ${SUPPORTED_PROGRAMS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  let targetCompany = null;
  if (normalizedRole === 'SUPERVISOR') {
    if (!companyId) {
      const error = new Error('Assigned company is required for a supervisor');
      error.status = 400;
      throw error;
    }
    targetCompany = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, isArchived: true }
    });
    if (!targetCompany || targetCompany.isArchived) {
      const error = new Error('Selected partner company was not found or is archived');
      error.status = 400;
      throw error;
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { student: true }
  });
  if (existing && !existing.isArchived) {
    const existingApprovalMap = existing.role === 'SUPERVISOR' ? await getSupervisorApprovalMap([existing.id]) : new Map();
    const existingMeta = existingApprovalMap.get(existing.id);
    if (existingMeta?.status === 'PENDING') {
      const error = new Error('A pending OJT Supervisor account request with this email address already exists.');
      error.status = 400;
      throw error;
    }
    const error = new Error(
      existing.role === 'STUDENT'
        ? 'A student account with this email already exists'
        : 'An account or request with this email address already exists'
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
    // Never recycle an archived student's email by deleting their profile: that
    // would cascade-delete attendance, submissions, logs and tasks and destroy
    // the very history the brief requires us to preserve.
    const error = new Error(
      'This email belongs to an archived student account. Restore that student from the Archive page, or use a different email address.'
    );
    error.status = 409;
    throw error;
  }

  // Same Microsoft verification gate as student creation. ADMIN and COORDINATOR
  // must exist in the school tenant when Graph is configured; SUPERVISOR is
  // exempt and is verified by its first successful Microsoft sign-in.
  const microsoftVerification = await verifySchoolAccountForCreation(normalizedEmail, normalizedRole);

  // Requirement 5B & 5D: Supervisor accounts start as Pending Approval (isActive: false)
  // and cannot log in until an Admin approves the request.
  const startsActive = normalizedRole !== 'SUPERVISOR';

  const accountData = {
    email: normalizedEmail,
    password: null,
    role: normalizedRole,
    isActive: startsActive,
    isArchived: false,
    archivedAt: null,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    contactNumber: normalizedContact,
    mustChangePassword: false,
    coordinatorCourse: normalizedCourse,
    coordinatorSections: normalizedSections,
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

  if (normalizedRole === 'COORDINATOR') {
    await syncStudentsForCoordinator(user.id, normalizedCourse, normalizedSections);
  }

  const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

  let approvalStatus = startsActive ? 'APPROVED' : 'PENDING';
  let approvalMetadata = null;

  if (normalizedRole === 'SUPERVISOR') {
    const nowIso = new Date().toISOString();
    approvalMetadata = {
      status: 'PENDING',
      supervisorId: user.id,
      supervisorEmail: normalizedEmail,
      supervisorName: fullName,
      contactNumber: normalizedContact,
      companyId: targetCompany?.id || companyId,
      companyName: targetCompany?.name || '',
      requestedById: requesterId || null,
      requestedByEmail: requesterEmail || null,
      coordinatorCourse: requesterCourse ? normalizeCourseCode(requesterCourse) : null,
      requestedAt: nowIso,
      reviewedById: null,
      reviewedByEmail: null,
      reviewedAt: null,
      rejectionReason: null,
      history: [
        {
          action: 'SUBMITTED',
          status: 'PENDING',
          actorId: requesterId || null,
          actorEmail: requesterEmail || null,
          actorRole: requesterRole || 'COORDINATOR',
          timestamp: nowIso
        }
      ]
    };

    await recordAudit({
      userId: requesterId || user.id,
      userEmail: requesterEmail || normalizedEmail,
      userRole: requesterRole || 'COORDINATOR',
      action: 'CREATE',
      entity: SUPERVISOR_APPROVAL_ENTITY,
      entityId: user.id,
      description: `OJT Supervisor account request submitted for ${fullName} (${targetCompany?.name || 'Partner Company'}) — Pending Approval`,
      metadata: approvalMetadata
    });

    // Notify all active ADMIN accounts about the pending supervisor account request
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true, isArchived: false },
        select: { id: true }
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'Pending OJT Supervisor Account Request',
            message: `OJT Coordinator (${requesterEmail || 'Coordinator'}) requested a Supervisor account for ${fullName} at ${targetCompany?.name || 'Partner Company'}. Please review and approve or reject.`,
            type: 'SUPERVISOR_APPROVAL_PENDING'
          }))
        });
      }
    } catch (notifErr) {
      console.warn('[accounts] Failed to notify admins of supervisor request:', notifErr.message);
    }
  }

  return {
    user: {
      ...user,
      approvalStatus,
      approvalMetadata
    },
    fullName,
    contactNumber: normalizedContact,
    microsoftVerification
  };
};

export const reviewSupervisorAccountRequest = async (
  userId,
  { action, rejectionReason } = {},
  reviewer = {}
) => {
  if (!reviewer || reviewer.role !== 'ADMIN') {
    const error = new Error('Only authorized Administrator accounts can approve or reject OJT Supervisor requests.');
    error.status = 403;
    throw error;
  }

  const decision = String(action || '').trim().toUpperCase();
  if (decision !== 'APPROVE' && decision !== 'REJECT') {
    const error = new Error('Review action must be APPROVE or REJECT.');
    error.status = 400;
    throw error;
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { supervisorCompany: { select: { id: true, name: true } } }
  });
  if (!existing || existing.isArchived) {
    const error = new Error('Supervisor account request not found.');
    error.status = 404;
    throw error;
  }
  if (existing.role !== 'SUPERVISOR') {
    const error = new Error('Only OJT Supervisor account requests can be reviewed here.');
    error.status = 400;
    throw error;
  }

  const approvalMap = await getSupervisorApprovalMap([userId]);
  const prevMeta = approvalMap.get(userId) || {};
  const nowIso = new Date().toISOString();
  const isApproved = decision === 'APPROVE';
  const nextStatus = isApproved ? 'APPROVED' : 'REJECTED';
  const cleanReason = isApproved ? null : (String(rejectionReason || '').trim() || 'Request rejected by Administrator');
  const fullName = [existing.firstName, existing.lastName].filter(Boolean).join(' ').trim() || existing.email;
  const companyName = existing.supervisorCompany?.name || prevMeta.companyName || 'Partner Company';

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: isApproved },
    select: staffSelect
  });
  invalidateUserAuthCache(userId);

  if (isApproved && existing.supervisorCompanyId) {
    await prisma.student.updateMany({
      where: { companyId: existing.supervisorCompanyId },
      data: {
        supervisorEmail: existing.email,
        supervisorName: fullName,
        ...(existing.contactNumber ? { supervisorContact: existing.contactNumber } : {})
      }
    });
  }

  const prevHistory = Array.isArray(prevMeta.history) ? prevMeta.history : [];
  const nextMeta = {
    ...prevMeta,
    status: nextStatus,
    supervisorId: existing.id,
    supervisorEmail: existing.email,
    supervisorName: fullName,
    contactNumber: existing.contactNumber || prevMeta.contactNumber || null,
    companyId: existing.supervisorCompanyId || prevMeta.companyId || null,
    companyName,
    reviewedById: reviewer.userId || null,
    reviewedByEmail: reviewer.email || null,
    reviewedAt: nowIso,
    rejectionReason: cleanReason,
    history: [
      ...prevHistory,
      {
        action: isApproved ? 'APPROVED' : 'REJECTED',
        status: nextStatus,
        actorId: reviewer.userId || null,
        actorEmail: reviewer.email || null,
        actorRole: 'ADMIN',
        rejectionReason: cleanReason,
        timestamp: nowIso
      }
    ]
  };

  await recordAudit({
    userId: reviewer.userId || null,
    userEmail: reviewer.email || null,
    userRole: 'ADMIN',
    action: isApproved ? 'APPROVE' : 'REJECT',
    entity: SUPERVISOR_APPROVAL_ENTITY,
    entityId: existing.id,
    description: isApproved
      ? `Approved OJT Supervisor account for ${fullName} (${companyName})`
      : `Rejected OJT Supervisor account for ${fullName} (${companyName}): ${cleanReason}`,
    metadata: nextMeta
  });

  // Notify the requesting OJT Coordinator (or active coordinators if requestedById is unavailable)
  try {
    const recipientIds = [];
    if (prevMeta.requestedById) {
      recipientIds.push(prevMeta.requestedById);
    } else {
      const coordinators = await prisma.user.findMany({
        where: { role: 'COORDINATOR', isActive: true, isArchived: false },
        select: { id: true }
      });
      recipientIds.push(...coordinators.map((c) => c.id));
    }

    if (recipientIds.length > 0) {
      await prisma.notification.createMany({
        data: [...new Set(recipientIds)].map((coordId) => ({
          userId: coordId,
          title: isApproved ? 'OJT Supervisor Account Approved' : 'OJT Supervisor Account Rejected',
          message: isApproved
            ? `Your OJT Supervisor account request for ${fullName} (${companyName}) was APPROVED by Admin (${reviewer.email || 'Administrator'}). The supervisor can now sign in.`
            : `Your OJT Supervisor account request for ${fullName} (${companyName}) was REJECTED by Admin (${reviewer.email || 'Administrator'}). Reason: ${cleanReason}`,
          type: isApproved ? 'SUPERVISOR_APPROVED' : 'SUPERVISOR_REJECTED'
        }))
      });
    }
  } catch (notifErr) {
    console.warn('[accounts] Failed to notify coordinator of supervisor review:', notifErr.message);
  }

  return {
    ...updatedUser,
    approvalStatus: nextStatus,
    approvalMetadata: nextMeta
  };
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
      // Never allow an edit to point a school role at a mailbox Microsoft does
      // not know about. Same gate as create; supervisors are exempt.
      await verifySchoolAccountForCreation(normalizedEmail, targetRole);
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

  // A role change must re-apply the Microsoft account policy even when the email
  // itself is unchanged: otherwise a supervisor with a personal Outlook address
  // could be promoted to coordinator and keep a non-school sign-in.
  if (data.role && data.role !== existing.role) {
    const roleMessage = roleEmailError({ email: data.email || existing.email, role: nextRole });
    if (roleMessage) {
      const error = new Error(roleMessage);
      error.status = 400;
      throw error;
    }
    if (!data.email) {
      await verifySchoolAccountForCreation(existing.email, nextRole);
    }
  }

  if (updateData.isActive !== undefined) data.isActive = Boolean(updateData.isActive);
  if (updateData.firstName !== undefined) {
    const cleanFirst = String(updateData.firstName || '').trim() || null;
    if (!cleanFirst || !isValidPersonName(cleanFirst)) {
      const error = new Error(PERSON_NAME_ERROR);
      error.status = 400;
      throw error;
    }
    data.firstName = cleanFirst;
  }
  if (updateData.lastName !== undefined) {
    const cleanLast = String(updateData.lastName || '').trim() || null;
    if (!cleanLast || !isValidPersonName(cleanLast)) {
      const error = new Error(PERSON_NAME_ERROR);
      error.status = 400;
      throw error;
    }
    data.lastName = cleanLast;
  }
  if (updateData.coordinatorCourse !== undefined) {
    data.coordinatorCourse = normalizeCourseCode(updateData.coordinatorCourse) || null;
    if (data.coordinatorCourse && !SUPPORTED_PROGRAMS.includes(data.coordinatorCourse)) {
      const error = new Error(`Course must be one of: ${SUPPORTED_PROGRAMS.join(', ')}`);
      error.status = 400;
      throw error;
    }
  }
  if (updateData.coordinatorSections !== undefined) {
    data.coordinatorSections = normalizeCoordinatorSections(updateData.coordinatorSections);
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

  if (nextRole !== 'COORDINATOR') {
    data.coordinatorCourse = null;
    data.coordinatorSections = [];
  }
  if (nextRole !== 'SUPERVISOR') data.supervisorCompanyId = null;

  const user = await prisma.user.update({ where: { id: userId }, data, select: staffSelect });
  invalidateUserAuthCache(userId);

  if (nextRole === 'COORDINATOR') {
    await syncStudentsForCoordinator(
      user.id,
      user.coordinatorCourse,
      user.coordinatorSections || []
    );
  }

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

export const batchCreateStaffAccounts = async (accounts, requesterContext = {}) => {
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
        contactNumber: account.contactNumber,
        ...requesterContext
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

  // Students are Microsoft-only. Issuing a password here would let them bypass
  // the school-account verification that happens on Microsoft sign-in.
  if (existing.role === 'STUDENT') {
    const error = new Error('Student accounts sign in with Microsoft Office 365; passwords cannot be issued here.');
    error.status = 400;
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
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
  invalidateUserAuthCache(userId);
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
