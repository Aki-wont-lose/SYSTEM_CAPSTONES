// src/middleware/auth.js
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { assertUsableSecret } from './secretGuard.js';

// Load .env explicitly BEFORE reading the secret. Previously the value was only
// available because `new PrismaClient()` happened to load .env as a side effect
// above this line - an implementation detail of Prisma, not a guarantee.
// dotenv never overrides variables that are already set, so Render/Vercel win.
dotenv.config();

const prisma = new PrismaClient();

// SECURITY: fail fast rather than fall back to a hardcoded secret. The previous
// `process.env.JWT_SECRET || 'your-secret-key'` meant a deployment missing the
// variable - or one that copied backend/.env.example verbatim - would sign and
// verify tokens with a secret published in the repository, letting anyone forge an
// ADMIN token offline. Refusing to boot is the only safe response.
const JWT_SECRET = process.env.JWT_SECRET;
export { JWT_SECRET };

assertUsableSecret(JWT_SECRET);

// 4 user levels — ADMIN, COORDINATOR, SUPERVISOR, STUDENT (adviser spec)
export const ROLES = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  SUPERVISOR: 'SUPERVISOR',
  STUDENT: 'STUDENT',
};

// Central permission map — same UI, limits by role (sidebar + endpoint)
// COORDINATOR manages requirements (+ PDF templates) and reviews logs; SUPERVISOR reviews logs
export const ROLE_PERMISSIONS = {
  ADMIN:       { canManageStudents: true,  canManageCompanies: true,  canManageRequirements: true, canManageRequirementTemplates: true, canReviewLogs: true, canManageAnnouncements: true, canViewAllDashboard: true },
  COORDINATOR: { canManageStudents: true,  canManageCompanies: true,  canManageRequirements: true, canManageRequirementTemplates: true, canReviewLogs: true, canManageAnnouncements: true, canViewAllDashboard: true },
  SUPERVISOR:  { canManageStudents: false, canManageCompanies: false, canManageRequirements: false, canManageRequirementTemplates: false, canReviewLogs: true,  canManageAnnouncements: false, canViewAllDashboard: true },
  STUDENT:     { canManageStudents: false, canManageCompanies: false, canManageRequirements: false, canManageRequirementTemplates: false, canReviewLogs: false, canManageAnnouncements: false, canViewAllDashboard: false },
};

// Authoritative identity lookup. `role`, `isActive`, `coordinatorCourse` and
// `supervisorCompanyId` all come from the database, never from the token, so a
// demotion, deactivation or re-assignment takes effect on the next request rather
// than whenever the old token happens to expire.
const lookupUser = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      coordinatorCourse: true,
      supervisorCompanyId: true
    }
  });

export const verifyToken = (req, res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');

    if (!token || scheme.toLowerCase() !== 'bearer') {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Pin the algorithm so a token cannot negotiate its way to a weaker scheme.
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;

    // Role and active state are authoritative in the database, not in the token.
    // Left unchecked, a demoted or deactivated account kept full privilege for the
    // remaining lifetime of its token (up to JWT_EXPIRE). `role` and
    // `supervisorCompanyId` are stashed for accessScope.js; the DB read also means a
    // deleted account can no longer act with a still-unexpired token.
    // One indexed primary-key lookup per request. Intentionally NOT cached: a
    // cached promise would pin the first caller's identity and reuse it for every
    // later request, which is worse than the original problem.
    lookupUser(decoded.userId)
      .then((user) => {
        if (!user || !user.isActive) {
          return res.status(401).json({ success: false, message: 'Account is inactive or no longer exists' });
        }
        if (user.role !== decoded.role) {
          // Role changed since the token was issued - force a fresh login.
          return res.status(401).json({ success: false, message: 'Permissions changed, please sign in again' });
        }
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          coordinatorCourse: user.coordinatorCourse,
          supervisorCompanyId: user.supervisorCompanyId
        };
        next();
      })
      .catch(() => res.status(401).json({ success: false, message: 'Invalid or expired token' }));
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const verifyRole = (allowedRoles) => {
  // Guard against the substring footgun: with a string, "ADMIN".includes("ADMI")
  // is true, so verifyRole('ADMIN') would also admit "ADMI"/"ADM". Fail loudly.
  if (!Array.isArray(allowedRoles)) {
    throw new Error('verifyRole() expects an array of role strings');
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions'
      });
    }

    next();
  };
};

export const generateToken = (userId, email, role, extra = {}) => {
  // `extra` used to be spread AFTER role, so an `extra` object containing a `role`
  // key silently overrode the caller's role. Reserve the identity fields.
  const { userId: _u, email: _e, role: _r, ...claims } = extra;

  return jwt.sign(
    { userId, email, role, ...claims },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d', algorithm: 'HS256' }
  );
};
