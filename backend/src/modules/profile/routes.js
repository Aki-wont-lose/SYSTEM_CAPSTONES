// modules/profile/routes.js — any authenticated role can view/update own profile
import express from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { fetchMyProfileUnified, updateMyProfileUnified } from './controller.js';
import { fetchMyProfile, updateMyProfileSelf } from '../../controllers/studentController.js';

const router = express.Router();

// Unified profile (works for ADMIN/SUPERVISOR/COMPANY/STUDENT) + legacy student profile
router.get('/', verifyToken, fetchMyProfileUnified);
router.put('/', verifyToken, updateMyProfileUnified);

// Backward compat for existing studentService routes
router.get('/student', verifyToken, fetchMyProfile);
router.put('/student', verifyToken, updateMyProfileSelf);

export default router;
