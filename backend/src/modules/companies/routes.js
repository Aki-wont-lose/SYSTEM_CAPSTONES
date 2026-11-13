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
import { verifyRole, denySuperAdmin } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', fetchCompanies);
router.get('/programs', fetchProgramOptions);
router.get('/:id', fetchCompanyById);

// ADMIN (non-SuperAdmin) + COORDINATOR can add/edit/archive partner companies
router.post('/batch', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, batchCreateCompaniesHandler);
router.post('/', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, addCompany);
router.put('/:id', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, editCompany);
router.delete('/:id', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, removeCompany);
router.post('/:id/assign', verifyRole(['ADMIN', 'COORDINATOR']), denySuperAdmin, assignStudent);

// Only ADMIN (non-SuperAdmin) can approve or reject partner companies
router.post('/:id/approve', verifyRole(['ADMIN']), denySuperAdmin, approveCompanyHandler);
router.post('/:id/reject', verifyRole(['ADMIN']), denySuperAdmin, rejectCompanyHandler);

export default router;
