// src/middleware/audit.js — automatic audit trail for every mutating API call
import jwt from 'jsonwebtoken';
import { recordAudit } from '../services/auditLogService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Sign-in and audit reads are recorded explicitly with better detail
const SKIP_PATH_PATTERNS = [/^\/api\/auth\//, /^\/api\/audit-logs/];

const ENTITIES = [
  [/^\/api\/requirements/, 'Requirement'],
  [/^\/api\/submissions/, 'Submission'],
  [/^\/api\/companies/, 'Company'],
  [/^\/api\/students/, 'Student'],
  [/^\/api\/accounts/, 'Account'],
  [/^\/api\/attendance/, 'Attendance'],
  [/^\/api\/logs/, 'LogEntry'],
  [/^\/api\/announcements/, 'Announcement'],
  [/^\/api\/connections/, 'Connection'],
  [/^\/api\/messages/, 'Message'],
  [/^\/api\/profile/, 'Profile'],
  [/^\/api\/dashboard/, 'Dashboard'],
];

// Body fields that are safe and useful to keep in the trail (never secrets or photos)
const METADATA_FIELDS = ['name', 'title', 'email', 'program', 'course', 'section', 'status', 'action', 'remarks', 'reason', 'companyId', 'studentId', 'requirementId', 'theme', 'role', 'programs', 'dueInDays', 'points', 'score', 'totalScore'];

const METHOD_ACTIONS = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

const identify = (path) => {
  const match = ENTITIES.find(([pattern]) => pattern.test(path));
  return match ? match[1] : 'System';
};

const actionFor = (req) => {
  if (req.method === 'DELETE') return 'DELETE';
  if (/\/review|\/respond/.test(req.path)) return 'REVIEW';
  if (/\/submit/.test(req.path)) return 'SUBMIT';
  if (req.method === 'POST' && /linked-accounts/.test(req.path)) return 'LINK';
  if (req.method === 'DELETE' && /linked-accounts/.test(req.path)) return 'UNLINK';
  return METHOD_ACTIONS[req.method] || 'UPDATE';
};

const collectMetadata = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const metadata = {};
  for (const field of METADATA_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      if (value.startsWith('data:')) continue;
      metadata[field] = value.slice(0, 120);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      metadata[field] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      metadata[field] = value.slice(0, 10).map((v) => v.slice(0, 60));
    }
  }
  return Object.keys(metadata).length ? metadata : undefined;
};

const VERBS = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  REVIEW: 'Reviewed',
  SUBMIT: 'Submitted',
  LINK: 'Linked',
  UNLINK: 'Unlinked',
};

export const auditTrail = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (SKIP_PATH_PATTERNS.some((pattern) => pattern.test(req.path))) return next();

  let actor = null;
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      actor = { userId: decoded.userId, userEmail: decoded.email, userRole: decoded.role };
    }
  } catch {
    actor = null;
  }

  res.on('finish', () => {
    const action = actionFor(req);
    const entity = identify(req.path);
    const verb = VERBS[action] || 'Changed';
    const resource = req.originalUrl.split('?')[0];

    recordAudit({
      ...(actor || {}),
      action,
      entity,
      entityId: req.body?.id || req.body?.connectionId || null,
      description: `${verb} ${entity.toLowerCase()} — ${req.method} ${resource}${res.statusCode >= 400 ? ` (failed with ${res.statusCode})` : ''}`,
      metadata: collectMetadata(req.body),
      ipAddress: req.ip,
    });
  });

  next();
};
