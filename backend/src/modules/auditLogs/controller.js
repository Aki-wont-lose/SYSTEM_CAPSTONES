// modules/auditLogs/controller.js
import { getAuditLogs, deleteAuditLog, clearAuditLogs } from '../../services/auditLogService.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchAuditLogs = asyncHandler(async (req, res) => {
  const data = await getAuditLogs(req.query);
  res.status(200).json({ success: true, data });
});

export const removeAuditLog = asyncHandler(async (req, res) => {
  const removed = await deleteAuditLog(req.params.id);
  res.status(200).json({ success: true, message: 'Audit log deleted', data: removed });
});

export const purgeAuditLogs = asyncHandler(async (req, res) => {
  const result = await clearAuditLogs();
  res.status(200).json({ success: true, message: 'Audit logs cleared', data: result });
});
