import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
};

export const markAllRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};

export const markRead = async (userId, id) => {
  // Ownership must be part of the update itself. The previous version accepted
  // userId and then ignored it, so any authenticated user could mark any other
  // user's notification as read by changing the id. updateMany + count check makes
  // a non-owned id a clean 404 rather than a silent cross-user write.
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  });
  if (result.count === 0) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }
  return prisma.notification.findUnique({ where: { id } });
};

export const deleteNotification = async (userId, id) => {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) throw new Error('Not found');
  return prisma.notification.delete({ where: { id } });
};
