// src/services/announcementService.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getActiveAnnouncements = async (limit = 10) => {
  return prisma.announcement.findMany({
    where: {
      isActive: true,
      publishedAt: {
        lte: new Date()
      }
    },
    orderBy: { publishedAt: 'desc' },
    take: limit
  });
};

export const getAllAnnouncements = async (filters = {}) => {
  const where = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return prisma.announcement.findMany({
    where,
    orderBy: { publishedAt: 'desc' }
  });
};

export const getAnnouncementById = async (id) => {
  return prisma.announcement.findUnique({
    where: { id }
  });
};

export const createAnnouncement = async (announcementData) => {
  const { title, content, category = 'General', priority = 'NORMAL', isActive = true, image, images } = announcementData;

  if (!title || !content) {
    const error = new Error('Title and content are required');
    error.status = 400;
    throw error;
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      category,
      priority,
      isActive,
      image: image || null,
      images: images || null,
      publishedAt: isActive ? new Date() : null
    }
  });

  // Create notification for all users when announcement is published
  if (isActive) {
    try {
      const users = await prisma.user.findMany({ select: { id: true } });
      const notifData = users.map(u => ({
        userId: u.id,
        title: `New Announcement: ${title}`,
        content: content.slice(0, 200),
        image: image || null
      }));
      // Batch create in chunks to avoid too many
      for (let i = 0; i < notifData.length; i += 50) {
        await prisma.notification.createMany({ data: notifData.slice(i, i+50) });
      }
    } catch (e) { console.error('Failed to create notifications', e.message); }
  }

  return announcement;
};

export const updateAnnouncement = async (id, updateData) => {
  try {
    // If status is being changed to active, set publishedAt
    if (updateData.isActive && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    return prisma.announcement.update({
      where: { id },
      data: updateData
    });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Announcement not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    return prisma.announcement.delete({
      where: { id }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      const err = new Error('Announcement not found');
      err.status = 404;
      throw err;
    }
    throw error;
  }
};

export const publishAnnouncement = async (id) => {
  return updateAnnouncement(id, {
    isActive: true,
    publishedAt: new Date()
  });
};

export const unpublishAnnouncement = async (id) => {
  return updateAnnouncement(id, {
    isActive: false
  });
};
