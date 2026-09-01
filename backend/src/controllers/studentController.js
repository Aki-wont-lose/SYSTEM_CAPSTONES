// src/controllers/studentController.js
import {
  getAllStudents,
  getStudentById,
  getStudentByUserId,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats
} from '../services/studentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const fetchAllStudents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  // Role-based filtering: coordinator sees only their course, supervisor only assigned company/students (first supervisor sees all for testing if no company)
  const filters = { ojt_status: status, search };
  if (req.user?.role === 'COORDINATOR' && req.user?.coordinatorCourse) {
    filters.course = req.user.coordinatorCourse;
  }
  if (req.user?.role === 'SUPERVISOR') {
    if (req.user?.supervisorCompanyId) filters.companyId = req.user.supervisorCompanyId;
    else if (req.user?.supervisorEmail || req.user?.email) {
      // Check if any students actually have this supervisorEmail; if none, show all for testing (first supervisor)
      const hasAssigned = await (await import('../services/studentService.js')).getAllStudents({ supervisorEmail: req.user.supervisorEmail || req.user.email });
      if (hasAssigned.length === 0) {
        // No assigned students yet - show all for testing
      } else {
        filters.supervisorEmail = req.user.supervisorEmail || req.user.email;
      }
    }
  }
  const students = await getAllStudents(filters);

  res.status(200).json({
    success: true,
    message: 'Students retrieved successfully',
    data: students
  });
});

export const fetchStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await getStudentById(id);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Student retrieved successfully',
    data: student
  });
});

export const fetchMyProfile = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: student
  });
});

// Lets a student edit their OWN profile — profilePicture allowed for gallery/default choices
const SELF_EDITABLE_FIELDS = ['course', 'section', 'email', 'contactNumber', 'profilePicture'];

export const updateMyProfileSelf = asyncHandler(async (req, res) => {
  const student = await getStudentByUserId(req.user.userId);

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student profile not found'
    });
  }

  const updateData = {};
  for (const field of SELF_EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  const updated = await updateStudent(student.id, updateData);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updated
  });
});

export const addStudent = asyncHandler(async (req, res) => {
  const {
    studentId,
    firstName,
    lastName,
    course,
    section,
    email,
    password,
    contactNumber,
    assignedCompany,
    role
  } = req.body;

  // If role is COORDINATOR or SUPERVISOR, only ADMIN can create them
  if (role === 'COORDINATOR' || role === 'SUPERVISOR') {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admin can create coordinator/supervisor accounts' });
    }
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required for staff' });
    }
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const { hashPassword } = await import('../services/authService.js');
    const hashed = await hashPassword(password);
    // Coordinator must have assigned course (BSHM/BSIT/BSTM), Supervisor must have company
    const extra = {};
    if (role === 'COORDINATOR') {
      if (!course || !['BSHM','BSIT','BSTM'].includes(course)) {
        await prisma.$disconnect();
        return res.status(400).json({ success: false, message: 'Assigned course (BSHM/BSIT/BSTM) required for coordinator' });
      }
      extra.coordinatorCourse = course;
    }
    if (role === 'SUPERVISOR') {
      if (!req.body.companyId) {
        await prisma.$disconnect();
        return res.status(400).json({ success: false, message: 'Assigned company required for supervisor' });
      }
      extra.supervisorCompanyId = req.body.companyId;
    }
    try {
      const user = await prisma.user.create({ data: { email, password: hashed, role, isActive: true, ...extra } });
      await prisma.$disconnect();
      return res.status(201).json({ success: true, message: `${role} account created`, data: user });
    } catch (e) {
      await prisma.$disconnect();
      if (e.code === 'P2002') return res.status(400).json({ success: false, message: 'email already exists' });
      throw e;
    }
  }

  // Default: STUDENT
  if (!studentId || !firstName || !lastName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const student = await createStudent(
    {
      studentId,
      firstName,
      lastName,
      course,
      section,
      email,
      contactNumber,
      assignedCompany
    },
    { email, password }
  );

  // Auto-add to Google Test Users if possible (for Testing mode)
  try {
    const { addTestUser } = await import('../services/googleTestUserService.js');
    await addTestUser(email);
  } catch (e) { console.warn('Google test user auto-add skipped', e.message); }

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: student
  });
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // Prevent updating sensitive linking fields only - studentId is now editable by admin/coordinator
  delete updateData.userId;
  delete updateData.user;

  const student = await updateStudent(id, updateData);

  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: student
  });
});

export const removeStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteStudent(id);

  res.status(200).json({
    success: true,
    message: 'Student deleted successfully'
  });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getStudentStats();

  res.status(200).json({
    success: true,
    message: 'Stats retrieved successfully',
    data: stats
  });
});
