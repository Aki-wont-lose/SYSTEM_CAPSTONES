// modules/messaging/service.js — Coordinator ↔ Supervisor (+ADMIN) contact
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Allowed contacts: COORDINATOR ↔ SUPERVISOR, ADMIN ↔ anyone (except STUDENT)
const canMessage = (senderRole, receiverRole) => {
  if (senderRole === 'STUDENT' || receiverRole === 'STUDENT') return false;
  // ADMIN can message anyone; COORDINATOR ↔ SUPERVISOR
  if (senderRole === 'ADMIN' || receiverRole === 'ADMIN') return true;
  return (senderRole === 'COORDINATOR' && receiverRole === 'SUPERVISOR') ||
         (senderRole === 'SUPERVISOR' && receiverRole === 'COORDINATOR');
};

export const getContactUsers = async (currentUserId, currentRole) => {
  let where = { isActive: true, id: { not: currentUserId } };
  if (currentRole === 'STUDENT') return [];
  if (currentRole === 'COORDINATOR') where.role = 'SUPERVISOR';
  else if (currentRole === 'SUPERVISOR') where.role = 'COORDINATOR';
  // ADMIN sees both
  else if (currentRole === 'ADMIN') where.role = { in: ['COORDINATOR', 'SUPERVISOR'] };
  return prisma.user.findMany({
    where,
    select: { id: true, email: true, role: true, isActive: true },
    orderBy: { role: 'asc' }
  });
};

export const getConversation = async (currentUserId, otherUserId) => {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: {
      sender: { select: { email: true, role: true } },
      receiver: { select: { email: true, role: true } }
    }
  });
};

export const sendMessage = async (senderId, senderRole, receiverId, content) => {
  if (!content?.trim()) {
    const e = new Error('Message cannot be empty'); e.status = 400; throw e;
  }
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true, isActive: true } });
  if (!receiver) { const e = new Error('Recipient not found'); e.status = 404; throw e; }
  if (!canMessage(senderRole, receiver.role)) {
    const e = new Error('You can only message Coordinator ↔ Supervisor (ADMIN can message both)');
    e.status = 403; throw e;
  }
  return prisma.message.create({
    data: { senderId, receiverId, content: content.trim() },
    include: { sender: { select: { email: true, role: true } } }
  });
};

export const markAsRead = async (userId, otherUserId) => {
  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: userId, isRead: false },
    data: { isRead: true }
  });
};

export const getUnreadCounts = async (userId) => {
  const groups = await prisma.message.groupBy({
    by: ['senderId'],
    where: { receiverId: userId, isRead: false },
    _count: { _all: true }
  });
  return groups.map(g => ({ senderId: g.senderId, count: g._count._all }));
};
