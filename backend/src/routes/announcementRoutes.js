// src/routes/announcementRoutes.js
import express from 'express';
import {
  fetchActiveAnnouncements,
  fetchAllAnnouncements,
  fetchAnnouncementById,
  addAnnouncement,
  updateAnnouncementData,
  removeAnnouncement,
  publishAnnouncementData,
  unpublishAnnouncementData
} from '../controllers/announcementController.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/active', fetchActiveAnnouncements);

// Protected routes
router.get('/', verifyToken, fetchAllAnnouncements);
router.get('/:id', verifyToken, fetchAnnouncementById);

// Admin routes
router.post('/', verifyToken, verifyRole(['ADMIN']), addAnnouncement);
router.put('/:id', verifyToken, verifyRole(['ADMIN']), updateAnnouncementData);
router.delete('/:id', verifyToken, verifyRole(['ADMIN']), removeAnnouncement);
router.post('/:id/publish', verifyToken, verifyRole(['ADMIN']), publishAnnouncementData);
router.post('/:id/unpublish', verifyToken, verifyRole(['ADMIN']), unpublishAnnouncementData);

export default router;
