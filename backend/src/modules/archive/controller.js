// modules/archive/controller.js
import {
  getArchivedRecords,
  restoreStudent,
  restoreCoordinator,
  restoreSupervisor,
  restoreCompany,
  deleteArchivedStudent,
  deleteArchivedCoordinator,
  deleteArchivedSupervisor,
  deleteArchivedCompany
} from './service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchArchivedRecords = asyncHandler(async (req, res) => {
  const data = await getArchivedRecords(req.user);
  res.status(200).json({ success: true, data });
});

export const restoreArchivedStudent = asyncHandler(async (req, res) => {
  const result = await restoreStudent(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Student restored', data: result });
});

export const restoreArchivedCoordinator = asyncHandler(async (req, res) => {
  const result = await restoreCoordinator(req.params.id);
  res.status(200).json({ success: true, message: 'Coordinator account restored', data: result });
});

export const restoreArchivedSupervisor = asyncHandler(async (req, res) => {
  const result = await restoreSupervisor(req.params.id);
  res.status(200).json({ success: true, message: 'Supervisor account restored', data: result });
});

export const restoreArchivedCompany = asyncHandler(async (req, res) => {
  const result = await restoreCompany(req.params.id);
  res.status(200).json({ success: true, message: 'Company restored', data: result });
});

export const deleteArchivedStudentHandler = asyncHandler(async (req, res) => {
  const result = await deleteArchivedStudent(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Student deleted permanently', data: result });
});

export const deleteArchivedCoordinatorHandler = asyncHandler(async (req, res) => {
  const result = await deleteArchivedCoordinator(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Coordinator deleted permanently', data: result });
});

export const deleteArchivedSupervisorHandler = asyncHandler(async (req, res) => {
  const result = await deleteArchivedSupervisor(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Supervisor deleted permanently', data: result });
});

export const deleteArchivedCompanyHandler = asyncHandler(async (req, res) => {
  const result = await deleteArchivedCompany(req.params.id, req.user);
  res.status(200).json({ success: true, message: 'Company deleted permanently', data: result });
});
