// src/controllers/companyController.js
import {
  getAllCompanies,
  getCompanyById,
  getCompanyPrograms,
  createCompany,
  updateCompany,
  deleteCompany,
  assignStudentToCompany,
  approveCompany,
  rejectCompany
} from '../services/companyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /companies - fetch companies with optional search/filters
export const fetchCompanies = asyncHandler(async (req, res) => {
  const { search, program, status, hasSlots, academicYear } = req.query;
  const activeOnly = req.user?.role === 'STUDENT';
  const companies = await getAllCompanies({ search, program, status, hasSlots, academicYear, activeOnly });
  res.status(200).json({ success: true, data: companies });
});

// GET /companies/programs - fetch the list of program options
export const fetchProgramOptions = asyncHandler(async (req, res) => {
  const programs = await getCompanyPrograms();
  res.status(200).json({ success: true, data: programs });
});

// GET /companies/:id - fetch one company by id
export const fetchCompanyById = asyncHandler(async (req, res) => {
  const company = await getCompanyById(req.params.id);
  if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
  res.status(200).json({ success: true, data: company });
});

// POST /companies - create a partner company
export const addCompany = asyncHandler(async (req, res) => {
  const company = await createCompany(req.body, req.user);
  res.status(201).json({ success: true, message: 'Company created', data: company });
});

// PUT /companies/:id - update a company
export const editCompany = asyncHandler(async (req, res) => {
  const company = await updateCompany(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Company updated', data: company });
});

// DELETE /companies/:id - archive a company (soft delete)
export const removeCompany = asyncHandler(async (req, res) => {
  await deleteCompany(req.params.id);
  res.status(200).json({ success: true, message: 'Company archived' });
});

// POST /companies/:id/assign - assign a student to a company
export const assignStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const student = await assignStudentToCompany(studentId, req.params.id);
  res.status(200).json({ success: true, message: 'Student assigned', data: student });
});

// POST /companies/batch - create many companies from a CSV-style batch upload
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

export const approveCompanyHandler = asyncHandler(async (req, res) => {
  const company = await approveCompany(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Partner company approved', data: company });
});

export const rejectCompanyHandler = asyncHandler(async (req, res) => {
  const company = await rejectCompany(req.params.id, req.body?.reason, req.user);
  res.status(200).json({ success: true, message: 'Partner company rejected', data: company });
});
