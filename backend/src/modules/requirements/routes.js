// modules/requirements/routes.js — COORDINATOR(+ADMIN) manages with PDF templates, SUPERVISOR reviews, STUDENT submit/view
import express from 'express';
import { fetchRequirements, fetchMySubmissions, fetchAllSubmissions, fetchGradingSummary, fetchMyTasks, finishMyTask, addRequirement, editRequirement, removeRequirement, upload, review } from '../../controllers/requirementController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', fetchRequirements);
router.get('/my-submissions', fetchMySubmissions);
router.get('/my-tasks', fetchMyTasks);
router.put('/my-tasks/:id/complete', finishMyTask);
// ADMIN + COORDINATOR + SUPERVISOR can review queue and view automated grading
router.get('/submissions/all', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchAllSubmissions);
router.get('/grading', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), fetchGradingSummary);

// ADMIN + COORDINATOR can create/update/delete requirement definitions (with PDF template)
router.post('/', verifyRole(['ADMIN','COORDINATOR']), addRequirement);
router.put('/:id', verifyRole(['ADMIN','COORDINATOR']), editRequirement);
router.delete('/:id', verifyRole(['ADMIN','COORDINATOR']), removeRequirement);

// Any authenticated user can submit; review limited to ADMIN+COORDINATOR+SUPERVISOR
router.post('/:id/submit', upload);
router.put('/submissions/:submissionId/review', verifyRole(['ADMIN','COORDINATOR','SUPERVISOR']), review);

export default router;
