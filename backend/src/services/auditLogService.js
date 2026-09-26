// src/services/auditLogService.js — writes and reads the system audit trail
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'REVIEW', 'SUBMIT', 'EXPORT', 'LINK', 'UNLINK'];

// Never throws: a failed audit write must not break the action being audited.
export const recordAudit = async ({
  userId = null,
  userEmail = null,
  userRole = null,
  action,
  entity,
  entityId = null,
  description,
  metadata = null,
  ipAddress = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail ? String(userEmail).slice(0, 120) : null,
        userRole: userRole || null,
        action,
        entity: String(entity || 'System'),
        entityId: entityId ? String(entityId) : null,
        description: String(description || '').slice(0, 500),
        metadata: metadata || undefined,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

export const getAuditLogs = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(filters.limit, 10) || 50));
  const where = {};

  if (filters.action && AUDIT_ACTIONS.includes(filters.action)) where.action = filters.action;
  if (filters.entity) where.entity = filters.entity;
  if (filters.userId) where.userId = filters.userId;
  if (filters.search) {
    const term = String(filters.search).trim();
    where.OR = [
      { description: { contains: term, mode: 'insensitive' } },
      { userEmail: { contains: term, mode: 'insensitive' } },
      { entity: { contains: term, mode: 'insensitive' } },
      { entityId: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
  }

  const [data, total, entities, actors] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where: { entity: { not: 'System' } }, distinct: ['entity'], select: { entity: true } }),
    prisma.auditLog.findMany({
      where: { userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true, userEmail: true, userRole: true },
    }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    facets: {
      actions: AUDIT_ACTIONS,
      entities: entities.map((e) => e.entity).sort(),
      actors: actors.filter((a) => a.userEmail).map((a) => ({ id: a.userId, email: a.userEmail, role: a.userRole })),
    },
  };
};
