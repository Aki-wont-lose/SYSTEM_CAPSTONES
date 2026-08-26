// src/controllers/companyController.js
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  assignStudentToCompany
} from '../services/companyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const fetchCompanies = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const companies = await getAllCompanies(search);
  res.status(200).json({ success: true, data: companies });
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
