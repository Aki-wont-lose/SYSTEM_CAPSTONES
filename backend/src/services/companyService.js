// src/services/companyService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const VALID_PROGRAMS = ['BSHM', 'BSIT', 'BSTM'];

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
  const where = {};
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
  return prisma.company.findUnique({
    where: { id },
    include: { students: true }
  });
};

export const createCompany = async (data) => {
  if (!data.name) {
    const error = new Error('Company name is required');
    error.status = 400;
    throw error;
  }
  return prisma.company.create({ data: normalizeCompanyInput(data) });
};

export const updateCompany = async (id, data) => {
  try {
    return await prisma.company.update({ where: { id }, data: normalizeCompanyInput(data) });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Company not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const deleteCompany = async (id) => {
  try {
    return await prisma.company.delete({ where: { id } });
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
  return prisma.student.update({
    where: { id: studentId },
    data: { companyId }
  });
};
