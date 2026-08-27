// src/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

export const verifyRole = (allowedRoles) => {
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
  return jwt.sign(
    { userId, email, role, ...extra },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};
