// src/routes/companyRoutes.js
import express from 'express';
import {
  fetchCompanies,
  fetchCompanyById,
  addCompany,
  editCompany,
  removeCompany,
  assignStudent
} from '../controllers/companyController.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', fetchCompanies); // students can view for their assigned company info
router.get('/:id', fetchCompanyById);
router.post('/', verifyRole(['ADMIN']), addCompany);
router.put('/:id', verifyRole(['ADMIN']), editCompany);
router.delete('/:id', verifyRole(['ADMIN']), removeCompany);
router.post('/:id/assign', verifyRole(['ADMIN']), assignStudent);

export default router;
