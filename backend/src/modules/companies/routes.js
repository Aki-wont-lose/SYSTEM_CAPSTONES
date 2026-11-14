// modules/companies/routes.js — ADMIN+COORDINATOR manage partner companies, Super Admin & others view
import express from 'express';
import {
  fetchCompanies,
  fetchProgramOptions,
  fetchCompanyById,
  addCompany,
  editCompany,
  removeCompany,
  assignStudent,
  batchCreateCompaniesHandler,
  approveCompanyHandler,
  rejectCompanyHandler
} from '../../controllers/companyController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', fetchCompanies);
router.get('/programs', fetchProgramOptions);
router.get('/:id', fetchCompanyById);

// Super Admin, Admin, and Coordinator can add/edit/archive partner companies
router.post('/batch', verifyRole(['ADMIN', 'COORDINATOR']), batchCreateCompaniesHandler);
router.post('/', verifyRole(['ADMIN', 'COORDINATOR']), addCompany);
router.put('/:id', verifyRole(['ADMIN', 'COORDINATOR']), editCompany);
router.delete('/:id', verifyRole(['ADMIN', 'COORDINATOR']), removeCompany);
router.post('/:id/assign', verifyRole(['ADMIN', 'COORDINATOR']), assignStudent);

// Super Admin and Admin can approve or reject partner companies
router.post('/:id/approve', verifyRole(['ADMIN']), approveCompanyHandler);
router.post('/:id/reject', verifyRole(['ADMIN']), rejectCompanyHandler);

export default router;
