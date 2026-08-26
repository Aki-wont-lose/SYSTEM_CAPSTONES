// src/routes/requirementRoutes.js
import express from 'express';
import {
  fetchRequirements,
  fetchMySubmissions,
  fetchAllSubmissions,
  addRequirement,
  editRequirement,
  removeRequirement,
  upload,
  review
} from '../controllers/requirementController.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', fetchRequirements);
router.get('/my-submissions', fetchMySubmissions);
router.get('/submissions/all', verifyRole(['ADMIN']), fetchAllSubmissions);
router.post('/', verifyRole(['ADMIN']), addRequirement);
router.put('/:id', verifyRole(['ADMIN']), editRequirement);
router.delete('/:id', verifyRole(['ADMIN']), removeRequirement);
router.post('/:id/submit', upload);
router.put('/submissions/:submissionId/review', verifyRole(['ADMIN']), review);

export default router;
