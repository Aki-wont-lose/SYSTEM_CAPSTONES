// modules/auditLogs/service.js - append-only audit trail
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
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
  const { action, role, from, to, search } = filters;
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 50));

  const where = { entity: { not: 'ProfileAvatar' } };
  if (action) where.action = String(action).toUpperCase();
  // Account-type filter in the UI maps to the role snapshot stored on the entry.
  if (role) where.userRole = String(role).toUpperCase();
  if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(`${to}T23:59:59.999Z`) };
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } },
      { entity: { contains: search, mode: 'insensitive' } }
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
