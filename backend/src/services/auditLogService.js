// modules/auditLogs/service.js - append-only audit trail
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REVIEW',
  'SUBMIT',
  'EXPORT',
  'LINK',
  'UNLINK'
];

export const getAuditLogs = async (filters = {}) => {
  const { page = 1, limit = 50, action, from, to, search } = filters;
  const where = {};
  if (action) where.action = action;
  if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(`${to}T23:59:59.999Z`) };
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    facets: {
      actions: AUDIT_ACTIONS
    }
  };
};

export const recordAudit = async ({ userId, userEmail, userRole, action, entity, entityId, description, metadata } = {}) => {
  return prisma.auditLog.create({
    data: { userId, userEmail, userRole, action, entity, entityId, description, metadata }
  });
};
