// modules/connections/service.js — friend requests that gate who can start a chat
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BLOCKED_EMAILS = [
  'Cabatu.334507@gmail.com',
  'mccruz1230@gmail.com',
  'CABATU.334507@GMAIL.COM',
  'MCCRUZ1230@GMAIL.COM'
];

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  student: { select: { firstName: true, lastName: true, studentId: true, course: true, profilePicture: true } }
};

const displayName = (user) =>
  user.student
    ? `${user.student.firstName} ${user.student.lastName}`
    : [user.firstName, user.lastName].filter(Boolean).join(' ') || String(user.email || '').split('@')[0].replace(/\./g, ' ');

// Direction-agnostic lookup so a request in either direction counts
const findConnection = async (userA, userB) => {
  const [outgoing, incoming] = await Promise.all([
    prisma.connection.findUnique({ where: { requesterId_addresseeId: { requesterId: userA, addresseeId: userB } } }),
    prisma.connection.findUnique({ where: { requesterId_addresseeId: { requesterId: userB, addresseeId: userA } } })
  ]);
  return { outgoing, incoming };
};

const relativeStatus = (currentUserId, connection) => {
  if (!connection) return 'NONE';
  if (connection.status === 'ACCEPTED') return 'ACCEPTED';
  if (connection.status === 'DECLINED') return 'DECLINED';
  return connection.requesterId === currentUserId ? 'PENDING_OUT' : 'PENDING_IN';
};

export const getConnections = async (currentUserId) => {
  const [accepted, incoming, outgoing] = await Promise.all([
    prisma.connection.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }] },
      include: { requester: { select: USER_SELECT }, addressee: { select: USER_SELECT } },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.connection.findMany({
      where: { addresseeId: currentUserId, status: 'PENDING' },
      include: { requester: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.connection.findMany({
      where: { requesterId: currentUserId, status: 'PENDING' },
      include: { addressee: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const other = (connection) => (connection.requesterId === currentUserId ? connection.addressee : connection.requester);
  const shape = (connection) => {
    const user = other(connection);
    return {
      id: connection.id,
      status: connection.status,
      direction: connection.requesterId === currentUserId ? 'OUTGOING' : 'INCOMING',
      createdAt: connection.createdAt,
      respondedAt: connection.respondedAt,
      user: { ...user, displayName: displayName(user) }
    };
  };

  return {
    accepted: accepted.map(shape),
    incoming: incoming.map(shape),
    outgoing: outgoing.map(shape)
  };
};

export const searchUsers = async (currentUserId, search) => {
  const term = (search || '').trim();
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: currentUserId },
      email: { notIn: BLOCKED_EMAILS },
      ...(term
        ? {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { student: { firstName: { contains: term, mode: 'insensitive' } } },
              { student: { lastName: { contains: term, mode: 'insensitive' } } },
              { student: { studentId: { contains: term, mode: 'insensitive' } } }
            ]
          }
        : {})
    },
    select: USER_SELECT,
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    take: 50
  });

  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }] },
    select: { requesterId: true, addresseeId: true, status: true }
  });

  const statusByUser = new Map(
    connections.map((c) => [c.requesterId === currentUserId ? c.addresseeId : c.requesterId, relativeStatus(currentUserId, c)])
  );

  return users.map((u) => ({
    ...u,
    displayName: displayName(u),
    studentId: u.student?.studentId || null,
    roleLabel: u.role.charAt(0) + u.role.slice(1).toLowerCase(),
    connectionStatus: statusByUser.get(u.id) || 'NONE'
  }));
};

export const sendRequest = async (currentUserId, targetUserId) => {
  if (currentUserId === targetUserId) {
    const e = new Error('You cannot send a request to yourself'); e.status = 400; throw e;
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } });
  if (!target || !target.isActive) { const e = new Error('User not found'); e.status = 404; throw e; }

  const existing = await findConnection(currentUserId, targetUserId);

  if (existing.outgoing) {
    if (existing.outgoing.status === 'ACCEPTED') { const e = new Error('You are already connected'); e.status = 400; throw e; }
    if (existing.outgoing.status === 'PENDING') { const e = new Error('Request already sent'); e.status = 400; throw e; }
  }

  if (existing.incoming) {
    if (existing.incoming.status === 'ACCEPTED') { const e = new Error('You are already connected'); e.status = 400; throw e; }
    if (existing.incoming.status === 'PENDING') {
      return prisma.connection.update({
        where: { id: existing.incoming.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() }
      });
    }
  }

  const connection = existing.outgoing
    ? await prisma.connection.update({ where: { id: existing.outgoing.id }, data: { status: 'PENDING', respondedAt: null } })
    : await prisma.connection.create({ data: { requesterId: currentUserId, addresseeId: targetUserId } });

  const sender = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { email: true, firstName: true, lastName: true, student: { select: { firstName: true, lastName: true } } }
  });
  const senderName = displayName(sender || { email: 'A user' });

  try {
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'New connection request',
        content: `${senderName} wants to connect with you.`
      }
    });
  } catch (e) { console.error('Failed to create connection notification', e.message); }

  return connection;
};

export const respondToRequest = async (currentUserId, connectionId, action) => {
  if (!['ACCEPT', 'DECLINE'].includes(action)) {
    const e = new Error('Action must be ACCEPT or DECLINE'); e.status = 400; throw e;
  }

  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection) { const e = new Error('Request not found'); e.status = 404; throw e; }
  if (connection.addresseeId !== currentUserId) { const e = new Error('Only the recipient can respond'); e.status = 403; throw e; }
  if (connection.status !== 'PENDING') { const e = new Error('This request was already answered'); e.status = 400; throw e; }

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data: { status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() }
  });

  if (action === 'ACCEPT') {
    try {
      await prisma.notification.create({
        data: {
          userId: connection.requesterId,
          title: 'Connection accepted',
          content: 'Your connection request was accepted. You can now start a chat.'
        }
      });
    } catch (e) { console.error('Failed to create accept notification', e.message); }
  }

  return updated;
};

export const removeConnection = async (currentUserId, connectionId) => {
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection) { const e = new Error('Connection not found'); e.status = 404; throw e; }
  if (connection.requesterId !== currentUserId && connection.addresseeId !== currentUserId) {
    const e = new Error('Not allowed'); e.status = 403; throw e;
  }
  await prisma.connection.delete({ where: { id: connectionId } });
  return { success: true };
};

export const getConnectionMap = async (currentUserId) => {
  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }] },
    select: { id: true, requesterId: true, addresseeId: true, status: true }
  });
  const map = new Map();
  for (const c of connections) {
    const otherId = c.requesterId === currentUserId ? c.addresseeId : c.requesterId;
    map.set(otherId, { ...relativeStatus(currentUserId, c), connectionId: c.id });
  }
  return map;
};
