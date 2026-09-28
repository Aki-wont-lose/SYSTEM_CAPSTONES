// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Feature-organised modules (see src/modules/* — dashboard, students, requirements, companies, logs, announcements, profile)
// Legacy routes kept for backward compat; modules are the canonical source now.
import authRoutes from './modules/auth/routes.js';
import accountRoutes from './modules/accounts/routes.js';
import studentRoutes from './modules/students/routes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import announcementRoutes from './modules/announcements/routes.js';
import companyRoutes from './modules/companies/routes.js';
import requirementRoutes from './modules/requirements/routes.js';
import logEntryRoutes from './modules/logs/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';
import profileRoutes from './modules/profile/routes.js';
import messagingRoutes from './modules/messaging/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import connectionRoutes from './modules/connections/routes.js';
import auditLogRoutes from './modules/auditLogs/routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { verifyToken } from './middleware/auth.js';
import { auditTrail } from './middleware/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// On Vercel the app is invoked as a serverless function, so a listening socket
// must not be opened. Locally (and on Render/Railway) we bind the port as usual.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Middleware
const allowedOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const isAllowed =
    configured.includes(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^https:\/\/[\w.-]*\.vercel\.app$/.test(origin);
  callback(null, isAllowed);
};

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Higher limit needed: camera photo captures and requirement file uploads
// are sent as base64 strings in the JSON body (no external file storage in this build).
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Every mutating call is written to the audit trail
app.use(auditTrail);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Public routes
app.use('/api/auth', authRoutes);
// /api/announcements is mounted WITHOUT verifyToken because GET /active is
// deliberately public (the login page renders announcements). Every other route in
// that module carries its own verifyToken, so it is not a gap.
app.use('/api/announcements', announcementRoutes);
app.use('/api/accounts', verifyToken, accountRoutes);

// Protected routes — organised by feature (same UI, role-limited via verifyRole inside each module).
// verifyToken is applied at the mount as defense in depth: dashboard/profile/notifications
// already guard every individual route, so this is idempotent, but it means a future
// route added to those modules without a guard is still refused by default.
app.use('/api/students', verifyToken, studentRoutes);
app.use('/api/attendance', verifyToken, attendanceRoutes);
app.use('/api/companies', verifyToken, companyRoutes);
app.use('/api/requirements', verifyToken, requirementRoutes);
app.use('/api/logs', verifyToken, logEntryRoutes);
app.use('/api/dashboard', verifyToken, dashboardRoutes); // ADMIN/COORDINATOR/SUPERVISOR stats + STUDENT /me
app.use('/api/profile', verifyToken, profileRoutes); // any role: GET /api/profile , PUT /api/profile
app.use('/api/messages', verifyToken, messagingRoutes); // Coordinator ↔ Supervisor (+ADMIN)
app.use('/api/notifications', verifyToken, notificationRoutes);
app.use('/api/connections', verifyToken, connectionRoutes); // friend requests that gate new student chats
app.use('/api/audit-logs', verifyToken, auditLogRoutes); // ADMIN/COORDINATOR read-only trail of every change

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

// Start server
if (!isServerless) {
  app.listen(PORT, () => {
    console.log(`✓ SIMES Backend Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
  });
}

export default app;
