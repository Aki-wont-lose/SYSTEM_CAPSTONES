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
import { createStaffAccount } from '../modules/accounts/service.js';
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
    contactNumber,
    companyId,
    role
  } = req.body;

  // Coordinator/supervisor accounts are managed by the accounts module
  if (role === 'COORDINATOR' || role === 'SUPERVISOR') {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only admin can create coordinator/supervisor accounts' });
    }
    const result = await createStaffAccount({
      email,
      firstName,
      lastName,
      role,
      coordinatorCourse: course,
      companyId,
      contactNumber
    });
    return res.status(201).json({
      success: true,
      message: `${role === 'COORDINATOR' ? 'Coordinator' : 'Supervisor'} account created`,
      data: { account: result.user, temporaryPassword: result.temporaryPassword }
    });
  }

  if (!studentId || !firstName || !lastName || !email) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const result = await createStudent(
    {
      studentId,
      firstName,
      lastName,
      course,
      section,
      email,
      contactNumber,
      companyId: companyId || undefined
    },
    { email }
  );

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: { student: result.student, temporaryPassword: result.temporaryPassword }
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

export const batchCreateStudentsHandler = asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, message: 'No students provided' });
  }
  const results = { created: 0, failed: 0, errors: [], credentials: [] };
  for (const s of students) {
    try {
      if (!s.studentId || !s.firstName || !s.lastName || !s.email) {
        results.failed++; results.errors.push(`${s.email || 'unknown'}: missing required fields`); continue;
      }
      const result = await createStudent(
        { studentId: s.studentId, firstName: s.firstName, lastName: s.lastName, course: s.course, section: s.section, email: s.email, contactNumber: s.contactNumber, companyId: s.companyId || undefined },
        { email: s.email }
      );
      results.created++;
      if (result.temporaryPassword) {
        results.credentials.push({ email: s.email, temporaryPassword: result.temporaryPassword });
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`${s.email}: ${e.message}`);
    }
  }
  res.status(200).json({ success: true, data: results });
});
