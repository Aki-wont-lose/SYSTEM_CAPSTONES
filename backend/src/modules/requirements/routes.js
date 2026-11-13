// modules/requirements/routes.js — Templates & Submissions with RBAC
import express from 'express';
import {
  fetchRequirements,
  fetchMySubmissions,
  fetchAllSubmissions,
  fetchGradingSummary,
  fetchMyTasks,
  finishMyTask,
  addRequirement,
  editRequirement,
  removeRequirement,
  upload,
  review,
  toggleRequirementCheck,
  removeMySubmission,
  removeSubmission,
  fetchSubmissionById,
  generateDocument
} from '../../controllers/requirementController.js';
import { verifyRole, denySuperAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Templates: Super Admin, Admin, Coordinator, Student can view (Supervisor has no Template module)
router.get('/', verifyRole(['ADMIN', 'COORDINATOR', 'STUDENT']), fetchRequirements);
router.get('/:id/generate', verifyRole(['ADMIN', 'COORDINATOR', 'STUDENT']), generateDocument);
router.post('/:id/generate', verifyRole(['ADMIN', 'COORDINATOR', 'STUDENT']), generateDocument);

// Student submissions & weekly tasks
router.get('/my-submissions', verifyRole(['STUDENT']), fetchMySubmissions);
router.get('/my-tasks', verifyRole(['STUDENT']), fetchMyTasks);
router.put('/my-tasks/:id/complete', verifyRole(['STUDENT']), finishMyTask);

// Staff review queue (Admin non-SuperAdmin, Coordinator, Supervisor)
router.get('/submissions/all', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), denySuperAdmin, fetchAllSubmissions);
router.get('/submissions/:submissionId', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR', 'STUDENT']), denySuperAdmin, fetchSubmissionById);
router.get('/grading', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), denySuperAdmin, fetchGradingSummary);

// ADMIN (non-SuperAdmin) + COORDINATOR can tick requirements off manually from the checklist
router.put('/checklist/:studentId/:requirementId', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, toggleRequirementCheck);

// ADMIN (non-SuperAdmin) + COORDINATOR can create/update/delete templates & requirements
router.post('/', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, addRequirement);
router.put('/:id', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, editRequirement);
router.delete('/:id', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, removeRequirement);

// Student submit/delete; Staff review/delete
router.post('/:id/submit', verifyRole(['STUDENT']), upload);
router.delete('/:id/submit', verifyRole(['STUDENT']), removeMySubmission);
router.put('/submissions/:submissionId/review', verifyRole(['ADMIN', 'COORDINATOR', 'SUPERVISOR']), denySuperAdmin, review);
router.delete('/submissions/:submissionId', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, removeSubmission);

export default router;
