// modules/archive/routes.js - archived records are staff-managed and restorable
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import {
  fetchArchivedRecords,
  restoreArchivedStudent,
  restoreArchivedCoordinator,
  restoreArchivedSupervisor,
  restoreArchivedCompany,
  deleteArchivedStudentHandler,
  deleteArchivedCoordinatorHandler,
  deleteArchivedSupervisorHandler,
  deleteArchivedCompanyHandler
} from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchArchivedRecords);
router.post('/students/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), restoreArchivedStudent);
router.post('/coordinators/:id/restore', verifyRole(['ADMIN']), restoreArchivedCoordinator);
router.post('/supervisors/:id/restore', verifyRole(['ADMIN']), restoreArchivedSupervisor);
router.post('/companies/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), restoreArchivedCompany);

// Permanent deletion is admin-only: it removes the record and its children
// instead of keeping the soft-archive history. The service refuses anything
// that is not already archived.
router.delete('/students/:id', verifyRole(['ADMIN']), deleteArchivedStudentHandler);
router.delete('/coordinators/:id', verifyRole(['ADMIN']), deleteArchivedCoordinatorHandler);
router.delete('/supervisors/:id', verifyRole(['ADMIN']), deleteArchivedSupervisorHandler);
router.delete('/companies/:id', verifyRole(['ADMIN']), deleteArchivedCompanyHandler);

export default router;
