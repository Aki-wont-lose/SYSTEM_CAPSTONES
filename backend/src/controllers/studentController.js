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
  const students = await getAllStudents({
    ojt_status: status,
    search
  });

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

  // If role is COORDINATOR or SUPERVISOR, create staff account (User only, no Student)
  if (role === 'COORDINATOR' || role === 'SUPERVISOR') {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required for staff' });
    }
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const { hashPassword } = await import('../services/authService.js');
    const hashed = await hashPassword(password);
    try {
      const user = await prisma.user.create({ data: { email, password: hashed, role, isActive: true } });
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
