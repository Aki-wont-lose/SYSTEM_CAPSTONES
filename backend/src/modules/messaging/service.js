// modules/messaging/service.js — chats are gated by accepted connections for students
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BLOCKED_EMAILS = [
  'Cabatu.334507@gmail.com',
  'mccruz1230@gmail.com',
  'CABATU.334507@GMAIL.COM',
  'MCCRUZ1230@GMAIL.COM'
];

const connectionState = async (userA, userB) => {
  const [outgoing, incoming] = await Promise.all([
    prisma.connection.findUnique({ where: { requesterId_addresseeId: { requesterId: userA, addresseeId: userB } } }),
    prisma.connection.findUnique({ where: { requesterId_addresseeId: { requesterId: userB, addresseeId: userA } } })
  ]);
  const connection = outgoing || incoming;
  if (!connection) return 'NONE';
  if (connection.status === 'ACCEPTED') return 'ACCEPTED';
  if (connection.status === 'DECLINED') return 'DECLINED';
  return connection.requesterId === userA ? 'PENDING_OUT' : 'PENDING_IN';
};

// Staff keep open access so they can reach interns; a student must be connected
// (or already have an existing thread) before starting a new conversation
export const canStartChat = async (senderId, senderRole, receiverId) => {
  if (senderRole !== 'STUDENT') return { allowed: true };
  if ((await connectionState(senderId, receiverId)) === 'ACCEPTED') return { allowed: true };

  const existing = await prisma.message.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    },
    select: { id: true }
  });
  if (existing) return { allowed: true };

  return { allowed: false, reason: 'pending' };
};

export const getContactUsers = async (currentUserId) => {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: currentUserId },
      email: { notIn: BLOCKED_EMAILS }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      student: { select: { firstName: true, lastName: true, studentId: true } }
    },
    orderBy: [{ role: 'asc' }, { email: 'asc' }]
  });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId },
        { receiverId: currentUserId }
      ]
    },
    select: {
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const conversationByUser = new Map();
  for (const message of messages) {
    const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
    const current = conversationByUser.get(otherUserId) || {
      unreadCount: 0,
      lastMessageAt: null,
      lastMessagePreview: null
    };
    if (message.receiverId === currentUserId && !message.isRead) current.unreadCount += 1;
    if (!current.lastMessageAt || message.createdAt > current.lastMessageAt) {
      current.lastMessageAt = message.createdAt;
      current.lastMessagePreview = message.content.startsWith('data:image') ? 'Photo' : message.content.slice(0, 80);
    }
    conversationByUser.set(otherUserId, current);
  }

  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }] },
    select: { id: true, requesterId: true, addresseeId: true, status: true }
  });
  const connectionByUser = new Map(
    connections.map((c) => {
      const otherId = c.requesterId === currentUserId ? c.addresseeId : c.requesterId;
      let status = c.status;
      if (status === 'PENDING') status = c.requesterId === currentUserId ? 'PENDING_OUT' : 'PENDING_IN';
      return [otherId, { status, connectionId: c.id }];
    })
  );

  return users.map(u => {
    const conversation = conversationByUser.get(u.id);
    const connection = connectionByUser.get(u.id);
    const name = u.student
      ? `${u.student.firstName} ${u.student.lastName}`
      : [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0].replace('.', ' ');
    return {
      ...u,
      displayName: name,
      studentId: u.student?.studentId || null,
      roleLabel: u.role.charAt(0) + u.role.slice(1).toLowerCase(),
      hasConversation: !!conversation,
      unreadCount: conversation?.unreadCount || 0,
      lastMessageAt: conversation?.lastMessageAt || null,
      lastMessagePreview: conversation?.lastMessagePreview || null,
      connectionStatus: connection?.status || 'NONE',
      connectionId: connection?.connectionId || null
    };
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
  if (senderId === receiverId) {
    const e = new Error('You cannot message yourself'); e.status = 400; throw e;
  }
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true, isActive: true } });
  if (!receiver || !receiver.isActive) { const e = new Error('Recipient not found'); e.status = 404; throw e; }

  const gate = await canStartChat(senderId, senderRole, receiverId);
  if (!gate.allowed) {
    const e = new Error('Send a connection request first — you can chat once it is accepted.');
    e.status = 403;
    throw e;
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { email: true, firstName: true, lastName: true, role: true, student: { select: { firstName: true, lastName: true } } }
  });
  const senderName = sender?.student
    ? `${sender.student.firstName} ${sender.student.lastName}`
    : [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || sender?.email?.split('@')[0] || 'A user';
  const message = await prisma.message.create({
    data: { senderId, receiverId, content: content.trim() },
    include: { sender: { select: { email: true, role: true } } }
  });
  try {
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: `New message from ${senderName}`,
        content: content.trim().startsWith('data:image') ? 'Sent a photo.' : content.trim().slice(0, 200)
      }
    });
  } catch (e) { console.error('Failed to create message notification', e.message); }
  return message;
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
