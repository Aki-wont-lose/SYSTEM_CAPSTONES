// modules/messaging/service.js - open messaging: any user can chat with anyone
import prisma from '../../utils/prisma.js';

// Duplicate gmail accounts left over from testing, hidden from the people directory
const BLOCKED_EMAILS = [
  'Cabatu.334507@gmail.com',
  'mccruz1230@gmail.com',
  'CABATU.334507@GMAIL.COM',
  'MCCRUZ1230@GMAIL.COM'
];

// Anyone can start a chat with anyone - no connection request needed
export const canStartChat = async () => ({ allowed: true });

export const getContactUsers = async (currentUserId) => {
  // Two round trips, run in parallel:
  //   1. the people directory
  //   2. one aggregate row per conversation
  //
  // The old version pulled every message body for the signed-in user just to
  // build previews. Photos are stored as base64, so a handful of image messages
  // turned this endpoint into a multi-second query and the inbox appeared to
  // hang. The aggregate below never leaves the database with more than 80
  // characters per conversation.
  const [users, conversationRows] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        isArchived: false,
        id: { not: currentUserId }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        student: { select: { firstName: true, lastName: true, studentId: true } }
      },
      orderBy: [{ email: 'asc' }]
    }),
    prisma.$queryRaw`
      SELECT
        CASE WHEN m."senderId" = ${currentUserId} THEN m."receiverId" ELSE m."senderId" END AS "otherId",
        bool_or(m."senderId" = ${currentUserId}) AS "hasSent",
        bool_or(m."senderId" <> ${currentUserId}) AS "hasReceived",
        count(*) FILTER (WHERE m."senderId" <> ${currentUserId} AND m."isRead" = false)::int AS "unreadCount",
        max(m."createdAt") AS "lastMessageAt",
        (array_agg(substring(m.content, 1, 80) ORDER BY m."createdAt" DESC))[1] AS "lastMessagePreview",
        ((array_agg(m."senderId" ORDER BY m."createdAt" DESC))[1] = ${currentUserId}) AS "lastMessageIsMine"
      FROM "Message" m
      WHERE m."senderId" = ${currentUserId} OR m."receiverId" = ${currentUserId}
      GROUP BY 1
    `
  ]);

  const conversationByUser = new Map(conversationRows.map((row) => [row.otherId, row]));
  const blocked = new Set(BLOCKED_EMAILS.map((email) => email.toLowerCase()));

  return users
    // Case-insensitive on purpose: the duplicate test accounts differ only by
    // capitalisation, which the old `notIn` filter (case-sensitive) missed.
    .filter((u) => !blocked.has(String(u.email || '').toLowerCase()))
    .map(u => {
      const conversation = conversationByUser.get(u.id);
      const name = u.student
        ? `${u.student.firstName} ${u.student.lastName}`
        : [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0].replace('.', ' ');
      // Explicit allow-list: the API never returns role (or any other account
      // attribute) to the messaging UI, so it cannot be displayed or spoofed there.
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: name,
        studentId: u.student?.studentId || null,
        hasConversation: Boolean(conversation),
        hasSent: conversation?.hasSent || false,
        hasReceived: conversation?.hasReceived || false,
        lastMessageIsMine: conversation?.lastMessageIsMine || false,
        unreadCount: conversation?.unreadCount || 0,
        lastMessageAt: conversation?.lastMessageAt || null,
        lastMessagePreview: conversation?.lastMessagePreview || null
      };
    });
};

export const getConversation = async (currentUserId, otherUserId) => {
  // Newest 200, then flipped back into reading order. The previous version
  // ordered ascending and took 200, which silently dropped every message after
  // the 200th - so a long thread stopped showing new replies altogether.
  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      createdAt: true
    }
  });

  return rows.reverse();
};

export const sendMessage = async (senderId, senderRole, receiverId, content) => {
  if (!content?.trim()) {
    const e = new Error('Message cannot be empty'); e.status = 400; throw e;
  }
  if (senderId === receiverId) {
    const e = new Error('You cannot message yourself'); e.status = 400; throw e;
  }
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true, isActive: true, isArchived: true } });
  if (!receiver || !receiver.isActive || receiver.isArchived) { const e = new Error('Recipient not found'); e.status = 404; throw e; }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { email: true, firstName: true, lastName: true, student: { select: { firstName: true, lastName: true } } }
  });
  const senderName = sender?.student
    ? `${sender.student.firstName} ${sender.student.lastName}`
    : [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || sender?.email?.split('@')[0] || 'A user';
  const message = await prisma.message.create({
    data: { senderId, receiverId, content: content.trim() },
    include: { sender: { select: { email: true } } }
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
  if (msg.senderId !== userId && msg.receiverId !== userId) {
    const e = new Error('Not authorized to delete this message');
    e.status = 403;
    throw e;
  }
  await prisma.message.delete({ where: { id: messageId } });
  return { success: true };
};

export const deleteConversation = async (currentUserId, otherUserId) => {
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    }
  });
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
