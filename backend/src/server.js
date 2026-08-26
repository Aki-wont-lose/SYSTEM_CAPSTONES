// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Feature-organised modules (see src/modules/* — dashboard, students, requirements, companies, logs, announcements, profile)
// Legacy routes kept for backward compat; modules are the canonical source now.
import authRoutes from './modules/auth/routes.js';
import studentRoutes from './modules/students/routes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import announcementRoutes from './modules/announcements/routes.js';
import companyRoutes from './modules/companies/routes.js';
import requirementRoutes from './modules/requirements/routes.js';
import logEntryRoutes from './modules/logs/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';
import profileRoutes from './modules/profile/routes.js';
import messagingRoutes from './modules/messaging/routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes — organised by feature (same UI, role-limited via verifyRole inside each module)
app.use('/api/announcements', announcementRoutes);
app.use('/api/students', verifyToken, studentRoutes);
app.use('/api/attendance', verifyToken, attendanceRoutes);
app.use('/api/companies', verifyToken, companyRoutes);
app.use('/api/requirements', verifyToken, requirementRoutes);
app.use('/api/logs', verifyToken, logEntryRoutes);
app.use('/api/dashboard', dashboardRoutes); // ADMIN/COORDINATOR/SUPERVISOR stats + STUDENT /me
app.use('/api/profile', profileRoutes); // any role: GET /api/profile , PUT /api/profile
app.use('/api/messages', verifyToken, messagingRoutes); // Coordinator ↔ Supervisor (+ADMIN)

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
app.listen(PORT, () => {
  console.log(`✓ SIMES Backend Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
});

export default app;
