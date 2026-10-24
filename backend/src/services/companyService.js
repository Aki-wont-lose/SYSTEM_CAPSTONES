// src/services/companyService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const VALID_PROGRAMS = ['BSIT', 'BSCS', 'BSCPE', 'BSACT', 'BSHM', 'BSTM', 'BSAIS'];

const normalizePrograms = (value) => {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(list.map((p) => String(p).trim().toUpperCase()).filter((p) => VALID_PROGRAMS.includes(p)))];
};

const COMPANY_FIELDS = [
  'name',
  'address',
  'latitude',
  'longitude',
  'contactPerson',
  'contactNumber',
  'email',
  'industryType',
  'availableSlots',
  'status'
];

const normalizeCompanyInput = (data) => {
  const payload = {};
  for (const field of COMPANY_FIELDS) {
    if (data[field] !== undefined) payload[field] = data[field];
  }
  if (data.programs !== undefined) payload.programs = normalizePrograms(data.programs);
  if (payload.availableSlots != null) payload.availableSlots = Number(payload.availableSlots) || 0;
  if (payload.latitude != null && payload.latitude !== '') payload.latitude = Number(payload.latitude);
  if (payload.longitude != null && payload.longitude !== '') payload.longitude = Number(payload.longitude);
  return payload;
};

export const getAllCompanies = async (filters = {}) => {
  const { search, program, status, hasSlots } = typeof filters === 'string' ? { search: filters } : filters;
  // Archived companies disappear from every listing (admin table and the
  // student's Find Company page) but keep their students and history intact.
  const where = { isArchived: false };
  const or = [];

  if (search) {
    or.push({ name: { contains: search, mode: 'insensitive' } });
    or.push({ industryType: { contains: search, mode: 'insensitive' } });
    or.push({ address: { contains: search, mode: 'insensitive' } });
  }
  if (or.length) where.OR = or;
  if (program && VALID_PROGRAMS.includes(String(program).toUpperCase())) {
    where.AND = [
      { OR: [{ programs: { has: String(program).toUpperCase() } }, { programs: { equals: [] } }] }
    ];
  }
  if (status) where.status = status;
  if (hasSlots === 'true') where.availableSlots = { gt: 0 };

  return prisma.company.findMany({
    where,
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

// Programs a company accepts; empty list means open to every program
export const getCompanyPrograms = () => VALID_PROGRAMS;

export const getCompanyById = async (id) => {
  // `include: { students: true }` returned every scalar column of every intern at
  // that company - email, contact number, supervisor contact and base64 profile
  // picture - to any authenticated caller, including students. Only staff who own
  // the company may see the roster, and then only the columns the roster needs.
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      students: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
          course: true,
          section: true,
          ojt_status: true,
          completedHours: true,
          requiredHours: true
        }
      }
    }
  });
  // Archived companies behave like deleted ones for lookups.
  return company && !company.isArchived ? company : null;
};

const COMPANY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COMPANY_PHONE_RE = /^(?:09\d{9}|\+?639\d{9}|\d{7,15})$/;

const validateCompanyFields = (data, { isCreate = false } = {}) => {
  const bad = (msg) => {
    const err = new Error(msg);
    err.status = 400;
    return err;
  };
  if (isCreate || data.name !== undefined) {
    if (!String(data.name || '').trim()) throw bad('Company name is required');
  }
  if (isCreate) {
    if (!String(data.address || '').trim()) throw bad('Company address is required');
    if (!String(data.contactPerson || '').trim()) throw bad('Contact person (supervisor name) is required');
    if (!String(data.contactNumber || '').trim()) throw bad('Company contact number is required');
    if (!String(data.email || '').trim()) throw bad('Company email address is required');
  }
  if (data.email !== undefined && String(data.email || '').trim()) {
    if (!COMPANY_EMAIL_RE.test(String(data.email).trim())) {
      throw bad('Please enter a valid company email address');
    }
  }
  if (data.contactNumber !== undefined && String(data.contactNumber || '').trim()) {
    const cleaned = String(data.contactNumber).trim().replace(/[\s\-()]/g, '');
    if (!COMPANY_PHONE_RE.test(cleaned)) {
      throw bad('Please enter a valid company contact number (e.g., 09171234567)');
    }
  }
  if (data.availableSlots !== undefined && Number(data.availableSlots) < 0) {
    throw bad('Available slots cannot be negative');
  }
};

export const createCompany = async (data) => {
  validateCompanyFields(data, { isCreate: true });
  return prisma.company.create({ data: normalizeCompanyInput(data) });
};

export const updateCompany = async (id, data) => {
  try {
    validateCompanyFields(data, { isCreate: false });
    const updated = await prisma.company.update({ where: { id }, data: normalizeCompanyInput(data) });

    // Sync updated company supervisor/contact details to students assigned to this company
    const studentSync = {};
    if (updated.contactPerson) studentSync.supervisorName = updated.contactPerson;
    if (updated.contactNumber) studentSync.supervisorContact = updated.contactNumber;
    if (Object.keys(studentSync).length > 0) {
      await prisma.student.updateMany({
        where: { companyId: id },
        data: studentSync
      });
    }
    return updated;
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Company not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

// Archive, never delete: student placements and attendance history point at this
// row, so removing it would orphan records. An archived company is also marked
// INACTIVE so it cannot be picked for new placements.
export const deleteCompany = async (id) => {
  try {
    return await prisma.company.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date(), status: 'INACTIVE' }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Company not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const assignStudentToCompany = async (studentId, companyId) => {
  const [company, existingStudent, companySupervisor] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        status: true,
        isArchived: true,
        programs: true,
        availableSlots: true,
        contactPerson: true,
        contactNumber: true,
        email: true
      }
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      select: { course: true, companyId: true, workingDays: true, workingHours: true }
    }),
    prisma.user.findFirst({
      where: { role: 'SUPERVISOR', supervisorCompanyId: companyId, isArchived: false },
      select: { email: true, firstName: true, lastName: true, contactNumber: true }
    })
  ]);
  if (!company || company.isArchived || company.status === 'INACTIVE') {
    const err = new Error('Company not found or inactive');
    err.status = 400;
    throw err;
  }
  if (!existingStudent) {
    const err = new Error('Student not found');
    err.status = 404;
    throw err;
  }
  const studentCourse = String(existingStudent.course || '').trim().toUpperCase();
  if (
    studentCourse &&
    Array.isArray(company.programs) &&
    company.programs.length > 0 &&
    !company.programs.includes(studentCourse)
  ) {
    const err = new Error(`${company.name} only accepts ${company.programs.join(', ')} interns (student is in ${studentCourse}).`);
    err.status = 400;
    throw err;
  }
  if (existingStudent.companyId !== companyId && company.availableSlots != null && company.availableSlots <= 0) {
    const err = new Error(`${company.name} has no open OJT slots available.`);
    err.status = 400;
    throw err;
  }

  const fullName = companySupervisor
    ? [companySupervisor.firstName, companySupervisor.lastName].filter(Boolean).join(' ').trim()
    : '';
  const updateData = {
    companyId,
    supervisorName: company.contactPerson || fullName || companySupervisor?.email || null,
    supervisorEmail: companySupervisor?.email || company.email || null,
    supervisorContact: companySupervisor?.contactNumber || company.contactNumber || null,
    workingDays: existingStudent?.workingDays || 'Monday - Friday',
    workingHours: existingStudent?.workingHours || '8:00 AM - 5:00 PM'
  };

  return prisma.student.update({
    where: { id: studentId },
    data: updateData,
    include: { company: true }
  });
};
