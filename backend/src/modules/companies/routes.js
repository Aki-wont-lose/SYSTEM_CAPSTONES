// modules/companies/routes.js — ADMIN+COORDINATOR manage partner companies, others view
import express from 'express';
import { fetchCompanies, fetchCompanyById, addCompany, editCompany, removeCompany, assignStudent } from '../../controllers/companyController.js';
import { verifyRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', fetchCompanies);
router.get('/:id', fetchCompanyById);
// ADMIN + COORDINATOR can mutate partner companies
router.post('/', verifyRole(['ADMIN','COORDINATOR']), addCompany);
router.put('/:id', verifyRole(['ADMIN','COORDINATOR']), editCompany);
router.delete('/:id', verifyRole(['ADMIN','COORDINATOR']), removeCompany);
router.post('/:id/assign', verifyRole(['ADMIN','COORDINATOR']), assignStudent);

export default router;
