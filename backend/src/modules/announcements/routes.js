// modules/announcements/routes.js - ADMIN manages, others read
// The super admin is excluded from this module entirely (reads of the full list
// included): announcements are an ADMIN responsibility. /active stays public
// because every dashboard shows it.
// The guard chain is spelled out on every route instead of shared through a
// const so audit-tests/announcementAccess.test.js can verify each one has it.
import express from 'express';
import { fetchActiveAnnouncements, fetchAllAnnouncements, fetchAnnouncementById, addAnnouncement, updateAnnouncementData, removeAnnouncement, publishAnnouncementData, unpublishAnnouncementData } from '../../controllers/announcementController.js';
import { verifyToken, verifyRole, denySuperAdmin } from '../../middleware/auth.js';

const router = express.Router();

router.get('/active', fetchActiveAnnouncements);
router.get('/', verifyToken, denySuperAdmin, fetchAllAnnouncements);
router.get('/:id', verifyToken, denySuperAdmin, fetchAnnouncementById);
router.post('/', verifyToken, verifyRole(['ADMIN']), denySuperAdmin, addAnnouncement);
router.put('/:id', verifyToken, verifyRole(['ADMIN']), denySuperAdmin, updateAnnouncementData);
router.delete('/:id', verifyToken, verifyRole(['ADMIN']), denySuperAdmin, removeAnnouncement);
router.post('/:id/publish', verifyToken, verifyRole(['ADMIN']), denySuperAdmin, publishAnnouncementData);
router.post('/:id/unpublish', verifyToken, verifyRole(['ADMIN']), denySuperAdmin, unpublishAnnouncementData);

export default router;
