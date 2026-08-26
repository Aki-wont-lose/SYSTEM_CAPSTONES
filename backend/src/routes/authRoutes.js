// src/routes/authRoutes.js
import express from 'express';
import {
  login,
  microsoftLogin,
  googleLogin,
  forgotPassword,
  doResetPassword,
  setTheme,
  register,
  validateToken
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);                 // Admin: direct email+password -> JWT
router.post('/microsoft', microsoftLogin);     // Student: Sign in with Microsoft
router.post('/google', googleLogin);           // Student: Sign in with Google (interim, while Microsoft accounts are pending from STI)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', doResetPassword);
router.post('/register', register);
router.get('/validate', verifyToken, validateToken);
router.post('/theme', verifyToken, setTheme);

export default router;
