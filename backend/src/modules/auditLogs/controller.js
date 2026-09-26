// modules/auditLogs/controller.js
import { getAuditLogs } from '../../services/auditLogService.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const fetchAuditLogs = asyncHandler(async (req, res) => {
  const data = await getAuditLogs(req.query);
  res.status(200).json({ success: true, data });
});
