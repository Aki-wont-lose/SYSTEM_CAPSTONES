// src/services/companyService.js
import prisma from '../utils/prisma.js';
import { normalizeCourseCode, isValidPersonName, PERSON_NAME_ERROR } from '../utils/studentValidation.js';
import {
  isValidPhAddressSelection,
  formatPhAddress,
  parsePhAddress
} from '../utils/phAddresses.js';
import {
  getAcceptedInternshipCourses,
  assertCourseAcceptedForInternship
} from '../modules/ojtHours/service.js';


export const VALID_PROGRAMS = ['BSIT', 'BSCS', 'BSCPE', 'ACT', 'BSHM', 'BSTM', 'BSAIS'];

export const normalizePrograms = (value) => {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[|;,/]+/);
  return [
    ...new Set(
      list
        .map((p) => normalizeCourseCode(p))
        .filter((p) => VALID_PROGRAMS.includes(p))
    )
  ];
};

const normalizeCompanyRecord = (company) => {
  if (!company) return company;
  return {
    ...company,
    programs: Array.isArray(company.programs) ? normalizePrograms(company.programs) : []
  };
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
  if (payload.name !== undefined) {
    payload.name = String(payload.name || '').trim().replace(/\s+/g, ' ');
  }
  if (payload.industryType !== undefined) {
    payload.industryType = String(payload.industryType || '').trim().replace(/\s+/g, ' ');
  }
  if (payload.contactPerson !== undefined) {
    payload.contactPerson = String(payload.contactPerson || '').trim().replace(/\s+/g, ' ');
  }
  if (payload.email !== undefined) {
    payload.email = String(payload.email || '').trim().toLowerCase();
  }
  if (data.region && data.province && data.city && data.barangay) {
    payload.address = formatPhAddress({
      region: data.region,
      province: data.province,
      city: data.city,
      barangay: data.barangay
    });
  } else if (payload.address !== undefined) {
    payload.address = String(payload.address || '').trim();
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
  const normalizedProgram = normalizeCourseCode(program);
  if (normalizedProgram && VALID_PROGRAMS.includes(normalizedProgram)) {
    const programVariants = normalizedProgram === 'ACT' ? ['ACT', 'BSACT', 'BSAC'] : [normalizedProgram];
    where.AND = [
      {
        OR: [
          ...programVariants.map((variant) => ({ programs: { has: variant } })),
          { programs: { equals: [] } }
        ]
      }
    ];
  }
  if (status) where.status = status;
  if (hasSlots === 'true') where.availableSlots = { gt: 0 };

  const companies = await prisma.company.findMany({
    where,
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return companies.map(normalizeCompanyRecord);
};

// Programs a company accepts; returns officially accepted internship courses
export const getCompanyPrograms = async () => [...VALID_PROGRAMS];

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
  return company && !company.isArchived ? normalizeCompanyRecord(company) : null;
};

const COMPANY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COMPANY_PHONE_RE = /^(?:09\d{9}|\+?639\d{9}|\d{7,15})$/;
const INDUSTRY_TYPE_RE = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;

export const validateCompanyFields = (data, { isCreate = false } = {}) => {
  const bad = (msg) => {
    const err = new Error(msg);
    err.status = 400;
    return err;
  };

  if (isCreate || data.name !== undefined) {
    const cleanName = String(data.name || '').trim().replace(/\s+/g, ' ');
    if (!cleanName) throw bad('Company name is required.');
    if (cleanName.length < 3 || cleanName.length > 100) {
      throw bad('Company name must be between 3 and 100 characters.');
    }
  }

  if (isCreate || data.industryType !== undefined) {
    const cleanIndustry = String(data.industryType || '').trim().replace(/\s+/g, ' ');
    if (!cleanIndustry) {
      throw bad('Industrial Type is required.');
    }
    if (/\d/.test(cleanIndustry)) {
      throw bad('Industrial Type must not contain numerical characters. Please use letters and spaces only.');
    }
    if (!INDUSTRY_TYPE_RE.test(cleanIndustry)) {
      throw bad('Industrial Type may only contain letters and spaces (e.g., Information Technology, Hospitality and Tourism).');
    }
  }

  const hasAddressParts =
    data.region !== undefined ||
    data.province !== undefined ||
    data.city !== undefined ||
    data.barangay !== undefined;

  if (hasAddressParts) {
    if (
      !isValidPhAddressSelection({
        region: data.region,
        province: data.province,
        city: data.city,
        barangay: data.barangay
      })
    ) {
      throw bad('Please select a valid Region, Province, City/Municipality, and Barangay.');
    }
  } else if (isCreate || data.address !== undefined) {
    const cleanAddress = String(data.address || '').trim();
    if (!cleanAddress) {
      throw bad('Complete company address (Region, Province, City/Municipality, and Barangay) is required.');
    }
    const parsed = parsePhAddress(cleanAddress);
    if (!parsed.region || !parsed.province || !parsed.city || !parsed.barangay) {
      throw bad('Please select a valid Philippine Region, Province, City/Municipality, and Barangay.');
    }
  }

  if (isCreate || data.contactPerson !== undefined) {
    const cleanContactPerson = String(data.contactPerson || '').trim();
    if (!cleanContactPerson) throw bad('Contact person (supervisor name) is required.');
    if (!isValidPersonName(cleanContactPerson)) {
      throw bad(`Contact person: ${PERSON_NAME_ERROR}`);
    }
  }

  if (isCreate || data.contactNumber !== undefined) {
    const rawPhone = String(data.contactNumber || '').trim();
    if (!rawPhone) throw bad('Company contact number is required.');
    const cleaned = rawPhone.replace(/[\s\-()]/g, '');
    if (!COMPANY_PHONE_RE.test(cleaned)) {
      throw bad('Please enter a valid company contact number (e.g., 09171234567).');
    }
  }

  if (isCreate || data.email !== undefined) {
    const cleanEmail = String(data.email || '').trim();
    if (!cleanEmail) throw bad('Company email address is required.');
    if (!COMPANY_EMAIL_RE.test(cleanEmail)) {
      throw bad('Please enter a valid company email address.');
    }
  }

  if (data.availableSlots !== undefined && Number(data.availableSlots) < 0) {
    throw bad('Available slots cannot be negative.');
  }
};

const validateAcceptedCompanyPrograms = async (rawPrograms) => {
  if (rawPrograms === undefined || rawPrograms === null) return;
  const list = Array.isArray(rawPrograms) ? rawPrograms : String(rawPrograms).split(/[|;,/]+/);
  const cleaned = list.map((p) => normalizeCourseCode(p)).filter(Boolean);
  const unaccepted = cleaned.filter((course) => !VALID_PROGRAMS.includes(course));
  if (unaccepted.length > 0) {
    const err = new Error(
      `Course(s) ${unaccepted.join(', ')} are not recognized STI programs (${VALID_PROGRAMS.join(', ')}).`
    );
    err.status = 400;
    throw err;
  }
};

export const createCompany = async (data) => {
  validateCompanyFields(data, { isCreate: true });
  await validateAcceptedCompanyPrograms(data.programs);
  const normalizedInput = normalizeCompanyInput(data);
  const cleanName = normalizedInput.name;
  const existing = await prisma.company.findFirst({
    where: { isArchived: false, name: { equals: cleanName, mode: 'insensitive' } },
    select: { id: true }
  });
  if (existing) {
    const err = new Error('A partner company with this name already exists');
    err.status = 400;
    throw err;
  }
  const created = await prisma.company.create({ data: normalizedInput });
  return normalizeCompanyRecord(created);
};

export const updateCompany = async (id, data) => {
  try {
    validateCompanyFields(data, { isCreate: false });
    await validateAcceptedCompanyPrograms(data.programs);
    const normalizedInput = normalizeCompanyInput(data);
    if (normalizedInput.name !== undefined) {
      const cleanName = normalizedInput.name;
      const existing = await prisma.company.findFirst({
        where: { isArchived: false, name: { equals: cleanName, mode: 'insensitive' }, NOT: { id } },
        select: { id: true }
      });
      if (existing) {
        const err = new Error('A partner company with this name already exists');
        err.status = 400;
        throw err;
      }
    }
    const updated = await prisma.company.update({ where: { id }, data: normalizedInput });

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
    return normalizeCompanyRecord(updated);
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
      where: { role: 'SUPERVISOR', supervisorCompanyId: companyId, isArchived: false, isActive: true },
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
  const studentCourse = normalizeCourseCode(existingStudent.course);
  if (studentCourse) {
    await assertCourseAcceptedForInternship(studentCourse);
  }
  const companyPrograms = normalizePrograms(company.programs);
  if (
    studentCourse &&
    companyPrograms.length > 0 &&
    !companyPrograms.includes(studentCourse)
  ) {
    const err = new Error(`${company.name} only accepts ${companyPrograms.join(', ')} interns (student is in ${studentCourse}).`);
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
