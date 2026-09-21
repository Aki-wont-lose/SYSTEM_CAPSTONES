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
  return prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
};

export const deleteNotification = async (userId, id) => {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) throw new Error('Not found');
  return prisma.notification.delete({ where: { id } });
};
