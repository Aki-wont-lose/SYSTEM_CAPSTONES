// src/controllers/companyController.js
import {
  getAllCompanies,
  getCompanyById,
  getCompanyPrograms,
  createCompany,
  updateCompany,
  deleteCompany,
  assignStudentToCompany
} from '../services/companyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const fetchCompanies = asyncHandler(async (req, res) => {
  const { search, program, status, hasSlots } = req.query;
  const companies = await getAllCompanies({ search, program, status, hasSlots });
  res.status(200).json({ success: true, data: companies });
});

export const fetchProgramOptions = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: getCompanyPrograms() });
});

export const fetchCompanyById = asyncHandler(async (req, res) => {
  const company = await getCompanyById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  res.status(200).json({ success: true, data: company });
});

export const addCompany = asyncHandler(async (req, res) => {
  const company = await createCompany(req.body);
  res.status(201).json({ success: true, message: 'Company created', data: company });
});

export const editCompany = asyncHandler(async (req, res) => {
  const company = await updateCompany(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Company updated', data: company });
});

export const removeCompany = asyncHandler(async (req, res) => {
  await deleteCompany(req.params.id);
  res.status(200).json({ success: true, message: 'Company deleted' });
});

export const assignStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const student = await assignStudentToCompany(studentId, req.params.id);
  res.status(200).json({ success: true, message: 'Student assigned', data: student });
});

export const batchCreateCompaniesHandler = asyncHandler(async (req, res) => {
  const { companies } = req.body;
  if (!Array.isArray(companies) || companies.length === 0) return res.status(400).json({ success: false, message: 'No companies provided' });
  const results = { created: 0, failed: 0, errors: [] };
  for (const c of companies) {
    try {
      if (!c.name) { results.failed++; results.errors.push(`${c.name || 'unknown'}: missing name`); continue; }
      await createCompany(c);
      results.created++;
    } catch (e) { results.failed++; results.errors.push(`${c.name}: ${e.message}`); }
  }
  res.status(200).json({ success: true, data: results });
});
