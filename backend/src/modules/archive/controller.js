// modules/archive/controller.js
import { getArchivedRecords, restoreStudent, restoreCoordinator, restoreCompany } from './service.js';
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

export const restoreArchivedCompany = asyncHandler(async (req, res) => {
  const result = await restoreCompany(req.params.id);
  res.status(200).json({ success: true, message: 'Company restored', data: result });
});
