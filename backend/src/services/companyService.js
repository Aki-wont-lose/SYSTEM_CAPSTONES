// src/services/companyService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllCompanies = async (search) => {
  const where = search
    ? { OR: [{ name: { contains: search } }, { industryType: { contains: search } }] }
    : {};
  return prisma.company.findMany({
    where,
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

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
  return prisma.company.create({ data });
};

export const updateCompany = async (id, data) => {
  try {
    return await prisma.company.update({ where: { id }, data });
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
