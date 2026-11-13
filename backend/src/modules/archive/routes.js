// modules/archive/routes.js - archived records are staff-managed and restorable
import express from 'express';
import { verifyRole, denySuperAdmin } from '../../middleware/auth.js';
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
router.post('/students/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, restoreArchivedStudent);
router.post('/coordinators/:id/restore', verifyRole(['ADMIN']), denySuperAdmin, restoreArchivedCoordinator);
router.post('/supervisors/:id/restore', verifyRole(['ADMIN']), denySuperAdmin, restoreArchivedSupervisor);
router.post('/companies/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, restoreArchivedCompany);

// Permanent deletion is admin-only: it removes the record and its children
// instead of keeping the soft-archive history. The service refuses anything
// that is not already archived.
router.delete('/students/:id', verifyRole(['ADMIN']), denySuperAdmin, deleteArchivedStudentHandler);
router.delete('/coordinators/:id', verifyRole(['ADMIN']), denySuperAdmin, deleteArchivedCoordinatorHandler);
router.delete('/supervisors/:id', verifyRole(['ADMIN']), denySuperAdmin, deleteArchivedSupervisorHandler);
router.delete('/companies/:id', verifyRole(['ADMIN']), denySuperAdmin, deleteArchivedCompanyHandler);

export default router;
