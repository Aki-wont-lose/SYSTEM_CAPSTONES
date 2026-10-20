// src/controllers/announcementController.js
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement
} from '../services/announcementService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /announcements/active - fetch active announcements for display
export const fetchActiveAnnouncements = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const announcements = await getActiveAnnouncements(parseInt(limit));

  res.status(200).json({
    success: true,
    message: 'Announcements retrieved successfully',
    data: announcements
  });
});

// GET /announcements - fetch all announcements with optional filters
export const fetchAllAnnouncements = asyncHandler(async (req, res) => {
  const { priority, category, isActive } = req.query;
  
  const filters = {};
  if (priority) filters.priority = priority;
  if (category) filters.category = category;
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const announcements = await getAllAnnouncements(filters);

  res.status(200).json({
    success: true,
    message: 'Announcements retrieved successfully',
    data: announcements
  });
});

// GET /announcements/:id - fetch a single announcement by id
export const fetchAnnouncementById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await getAnnouncementById(id);

  if (!announcement) {
    return res.status(404).json({
      success: false,
      message: 'Announcement not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Announcement retrieved successfully',
    data: announcement
  });
});

// POST /announcements - create a new announcement (admin)
export const addAnnouncement = asyncHandler(async (req, res) => {
  const { title, content, category, priority, isActive } = req.body;

  const announcement = await createAnnouncement({
    title,
    content,
    category,
    priority,
    isActive
  });

  res.status(201).json({
    success: true,
    message: 'Announcement created successfully',
    data: announcement
  });
});

// PUT /announcements/:id - update an announcement
export const updateAnnouncementData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const announcement = await updateAnnouncement(id, updateData);

  res.status(200).json({
    success: true,
    message: 'Announcement updated successfully',
    data: announcement
  });
});

// DELETE /announcements/:id - delete an announcement
export const removeAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteAnnouncement(id);

  res.status(200).json({
    success: true,
    message: 'Announcement deleted successfully'
  });
});

// POST /announcements/:id/publish - publish an announcement
export const publishAnnouncementData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await publishAnnouncement(id);

  res.status(200).json({
    success: true,
    message: 'Announcement published successfully',
    data: announcement
  });
});

// POST /announcements/:id/unpublish - unpublish an announcement
export const unpublishAnnouncementData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await unpublishAnnouncement(id);

  res.status(200).json({
    success: true,
    message: 'Announcement unpublished successfully',
    data: announcement
  });
});
