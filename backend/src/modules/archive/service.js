// modules/archive/service.js - list, restore and permanently delete soft-archived records
import prisma from '../../utils/prisma.js';
import { canAccessStudent } from '../../services/accessScope.js';
import { recordAudit } from '../../services/auditLogService.js';
import { archiveExpiredCompanies, normalizeAcademicYear } from '../../services/companyService.js';


const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const auditRequester = (user) => ({
  userId: user?.userId || null,
  userEmail: user?.email || null,
  userRole: user?.role || null
});

// The record is already gone by the time we log it, so a logging failure must
// never turn a successful deletion into a 500.
const safeAudit = async (entry) => {
  try {
    await recordAudit(entry);
  } catch (error) {
    console.error('Failed to record delete audit entry:', error.message);
  }
};

// Archived records are still in the database; this never hard-deletes them.
export const getArchivedRecords = async (user) => {
  await archiveExpiredCompanies();
  const isAdmin = user?.role === 'ADMIN';
  const isCoordinator = user?.role === 'COORDINATOR';

  const studentScope = isAdmin
    ? {}
    : isCoordinator && user.coordinatorCourse
      ? { course: user.coordinatorCourse }
      : { id: '__no_access__' };

  const students = await prisma.student.findMany({
    where: { isArchived: true, ...studentScope },
    include: {
      user: { select: { email: true } },
      company: { select: { name: true } }
    },
    orderBy: { archivedAt: 'desc' }
  });

  let coordinators = [];
  if (isAdmin) {
    coordinators = await prisma.user.findMany({
      where: { isArchived: true, role: 'COORDINATOR' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        coordinatorCourse: true,
        isActive: true,
        archivedAt: true
      },
      orderBy: { archivedAt: 'desc' }
    });
  }

  // Supervisors were previously invisible here: once archived they could not be
  // found or restored from the UI at all.
  let supervisors = [];
  if (isAdmin) {
    supervisors = await prisma.user.findMany({
      where: { isArchived: true, role: 'SUPERVISOR' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        archivedAt: true,
        supervisorCompany: { select: { name: true } }
      },
      orderBy: { archivedAt: 'desc' }
    });
  }

  const companies = isAdmin || isCoordinator
    ? await prisma.company.findMany({
        where: { isArchived: true },
        include: { _count: { select: { students: true } } },
        orderBy: { archivedAt: 'desc' }
      })
    : [];

  return { students, coordinators, supervisors, companies };
};

export const restoreStudent = async (studentId, user) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      userId: true,
      course: true,
      companyId: true,
      supervisorEmail: true,
      isArchived: true
    }
  });

  if (!student) throw notFound('Student not found');
  if (!canAccessStudent(user, student)) {
    const error = new Error('You do not have access to this record.');
    error.status = 403;
    throw error;
  }
  if (!student.isArchived) return { success: true, restored: false };

  await prisma.student.update({
    where: { id: studentId },
    data: { isArchived: false, archivedAt: null }
  });

  // The linked login was archived together with the student; bring it back too.
  try {
    await prisma.user.update({
      where: { id: student.userId },
      data: { isArchived: false, isActive: true, archivedAt: null }
    });
  } catch {
    // Login row already gone - the student record is still restored.
  }

  return { success: true, restored: true };
};

export const restoreCoordinator = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isArchived: true }
  });

  if (!user || user.role !== 'COORDINATOR') throw notFound('Coordinator account not found');
  if (!user.isArchived) return { success: true, restored: false };

  await prisma.user.update({
    where: { id: userId },
    data: { isArchived: false, isActive: true, archivedAt: null }
  });

  return { success: true, restored: true };
};

export const restoreSupervisor = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isArchived: true }
  });

  if (!user || user.role !== 'SUPERVISOR') throw notFound('Supervisor account not found');
  if (!user.isArchived) return { success: true, restored: false };

  await prisma.user.update({
    where: { id: userId },
    data: { isArchived: false, isActive: true, archivedAt: null }
  });

  return { success: true, restored: true };
};

export const restoreCompany = async (companyId, payload = {}, requester = null) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) throw notFound('Company not found');
  if (!company.isArchived) return { success: true, restored: false };

  const newAcademicYear = normalizeAcademicYear(payload.academicYear);
  const newStartDate = payload.startDate ? new Date(payload.startDate) : null;
  const newExpirationDate = payload.expirationDate ? new Date(payload.expirationDate) : null;

  if (!newAcademicYear || !newStartDate || !newExpirationDate) {
    throw badRequest('Academic Year, Start Date, and Expiration Date are required to restore or renew a partner company.');
  }
  if (Number.isNaN(newStartDate.getTime()) || Number.isNaN(newExpirationDate.getTime())) {
    throw badRequest('Invalid Start Date or Expiration Date.');
  }
  if (newExpirationDate <= newStartDate) {
    throw badRequest('Expiration date must be later than start date.');
  }

  // If renewing for a new academic year (or restoring an expired partnership),
  // preserve the old academic-year record in Archive and create a fresh active record.
  const isNewAcademicYear = company.academicYear && company.academicYear !== newAcademicYear;
  if (isNewAcademicYear || company.status === 'EXPIRED') {
    const duplicate = await prisma.company.findFirst({
      where: {
        isArchived: false,
        name: { equals: company.name, mode: 'insensitive' },
        academicYear: newAcademicYear
      },
      select: { id: true }
    });
    if (duplicate) {
      throw badRequest(`${company.name} already has an active record for Academic Year ${newAcademicYear}.`);
    }

    const renewed = await prisma.company.create({
      data: {
        name: company.name,
        address: company.address,
        latitude: company.latitude,
        longitude: company.longitude,
        contactPerson: company.contactPerson,
        contactNumber: company.contactNumber,
        email: company.email,
        industryType: company.industryType,
        programs: company.programs,
        availableSlots: company.availableSlots,
        academicYear: newAcademicYear,
        startDate: newStartDate,
        expirationDate: newExpirationDate,
        parentCompanyId: company.parentCompanyId || company.id,
        status: 'ACTIVE',
        isArchived: false
      }
    });

    await safeAudit({
      ...auditRequester(requester),
      action: 'CREATE',
      entity: 'Company',
      entityId: renewed.id,
      description: `Renewed partner company ${company.name} for AY ${newAcademicYear} (preserved AY ${company.academicYear || 'N/A'} history)`,
      metadata: {
        previousCompanyId: company.id,
        previousAcademicYear: company.academicYear,
        academicYear: newAcademicYear,
        startDate: newStartDate,
        expirationDate: newExpirationDate
      }
    });

    return { success: true, restored: true, renewed: true, company: renewed };
  }

  const restored = await prisma.company.update({
    where: { id: companyId },
    data: {
      isArchived: false,
      archivedAt: null,
      status: 'ACTIVE',
      academicYear: newAcademicYear,
      startDate: newStartDate,
      expirationDate: newExpirationDate
    }
  });

  await safeAudit({
    ...auditRequester(requester),
    action: 'UPDATE',
    entity: 'Company',
    entityId: companyId,
    description: `Restored partner company ${company.name} for AY ${newAcademicYear}`,
    metadata: { academicYear: newAcademicYear, startDate: newStartDate, expirationDate: newExpirationDate }
  });

  return { success: true, restored: true, company: restored };
};

// ---------------------------------------------------------------------------
// Permanent deletion
//
// Only records that are already archived can be removed, so an active account
// can never be wiped by mistake. Deleting the login row cascades to the student
// profile and all of its children (DTR, submissions, logs, weekly tasks,
// messages, connections) through the onDelete rules in schema.prisma. Audit log
// entries are kept: AuditLog.userId is optional and is set to null, so the
// trail of who deleted what survives.
// ---------------------------------------------------------------------------

export const deleteArchivedStudent = async (studentId, requester) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      studentId: true,
      email: true,
      isArchived: true
    }
  });

  if (!student) throw notFound('Student not found');
  if (!student.isArchived) {
    throw badRequest('Archive this student first. Only archived records can be deleted permanently.');
  }

  const name = `${student.firstName} ${student.lastName}`.trim() || student.email;

  await prisma.$transaction([
    prisma.user.deleteMany({ where: { id: student.userId } }),
    prisma.student.deleteMany({ where: { id: student.id } })
  ]);

  await safeAudit({
    ...auditRequester(requester),
    action: 'DELETE',
    entity: 'Student',
    entityId: student.id,
    description: `Permanently deleted student ${name} (${student.studentId})`
  });

  return { success: true, deleted: true };
};

const deleteArchivedStaffAccount = async (userId, role, requester) => {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, firstName: true, lastName: true, isArchived: true }
  });

  if (!account || account.role !== role) {
    throw notFound(`${role === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'} account not found`);
  }
  if (!account.isArchived) {
    throw badRequest('Archive this account first. Only archived records can be deleted permanently.');
  }

  const name = [account.firstName, account.lastName].filter(Boolean).join(' ') || account.email;

  await prisma.user.delete({ where: { id: account.id } });

  await safeAudit({
    ...auditRequester(requester),
    action: 'DELETE',
    entity: 'Account',
    entityId: account.id,
    description: `Permanently deleted ${role.toLowerCase()} account ${name} (${account.email})`
  });

  return { success: true, deleted: true };
};

export const deleteArchivedCoordinator = (userId, requester) =>
  deleteArchivedStaffAccount(userId, 'COORDINATOR', requester);

export const deleteArchivedSupervisor = (userId, requester) =>
  deleteArchivedStaffAccount(userId, 'SUPERVISOR', requester);

export const deleteArchivedCompany = async (companyId, requester) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      isArchived: true,
      _count: { select: { students: true, supervisors: true } }
    }
  });

  if (!company) throw notFound('Company not found');
  if (!company.isArchived) {
    throw badRequest('Archive this company first. Only archived records can be deleted permanently.');
  }
  if (company._count.students > 0 || company._count.supervisors > 0) {
    throw badRequest(
      `This company still has ${company._count.students} student record(s) and ${company._count.supervisors} supervisor account(s) linked to it. ` +
        'Reassign or delete those records before deleting the company.'
    );
  }

  await prisma.company.delete({ where: { id: company.id } });

  await safeAudit({
    ...auditRequester(requester),
    action: 'DELETE',
    entity: 'Company',
    entityId: company.id,
    description: `Permanently deleted company ${company.name}`
  });

  return { success: true, deleted: true };
};
