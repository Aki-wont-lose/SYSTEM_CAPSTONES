// modules/archive/routes.js - archived records are staff-managed and restorable
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import {
  fetchArchivedRecords,
  restoreArchivedStudent,
  restoreArchivedCoordinator,
  restoreArchivedCompany
} from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchArchivedRecords);
router.post('/students/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), restoreArchivedStudent);
router.post('/coordinators/:id/restore', verifyRole(['ADMIN']), restoreArchivedCoordinator);
router.post('/companies/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), restoreArchivedCompany);

export default router;
