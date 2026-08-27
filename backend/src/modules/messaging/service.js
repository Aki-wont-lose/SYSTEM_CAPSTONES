// modules/messaging/service.js — Coordinator ↔ Supervisor (+ADMIN) contact
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// All roles can message all (admin/coordinator/supervisor/student)
const canMessage = (senderRole, receiverRole) => {
  if (senderRole === receiverRole && senderRole === 'STUDENT') {
    // Students can message staff and other students now
  }
  return true; // allow any authenticated user to message any other active user
};

export const getContactUsers = async (currentUserId, currentRole) => {
  // All roles see all other active users - searchable by name (student first/last) or email
  // Show "No contact yet till not messaging" is handled in frontend (empty state)
  const users = await prisma.user.findMany({
    where: { isActive: true, id: { not: currentUserId } },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      student: { select: { firstName: true, lastName: true, studentId: true } }
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }]
  });
  // Map to include displayName for search
  return users.map(u => ({
    ...u,
    displayName: u.student ? `${u.student.firstName} ${u.student.lastName}` : u.email.split('@')[0],
    studentId: u.student?.studentId || null
  }));
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

export const deleteMessage = async (userId, messageId) => {
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) { const e = new Error('Message not found'); e.status = 404; throw e; }
  if (msg.senderId !== userId) { const e = new Error('Only sender can delete'); e.status = 403; throw e; }
  await prisma.message.delete({ where: { id: messageId } });
  return { success: true };
};

export const getUnreadCounts = async (userId) => {
  const groups = await prisma.message.groupBy({
    by: ['senderId'],
    where: { receiverId: userId, isRead: false },
    _count: { _all: true }
  });
  return groups.map(g => ({ senderId: g.senderId, count: g._count._all }));
};
