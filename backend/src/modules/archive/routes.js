// modules/archive/routes.js - archived records are staff-managed and restorable
import express from 'express';
import { verifyRole } from '../../middleware/auth.js';
import {
  fetchArchivedRecords,
  restoreArchivedStudent,
  restoreArchivedStaff,
  restoreArchivedCompany
} from './controller.js';

const router = express.Router();

router.get('/', verifyRole(['ADMIN', 'COORDINATOR']), fetchArchivedRecords);
router.post('/students/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), restoreArchivedStudent);
router.post('/staff/:id/restore', verifyRole(['ADMIN']), restoreArchivedStaff);
router.post('/companies/:id/restore', verifyRole(['ADMIN', 'COORDINATOR']), restoreArchivedCompany);

export default router;
