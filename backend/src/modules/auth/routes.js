// modules/auth/routes.js
import express from 'express';
import { login, microsoftLogin, googleLogin, forgotPassword, doResetPassword, setTheme, register, validateToken } from '../../controllers/authController.js';
import { verifyToken } from '../../middleware/auth.js';

const router = express.Router();

// Same UI login — backend decides based on role. ADMIN/COORDINATOR/SUPERVISOR use password, STUDENT uses OAuth
router.post('/login', login);
router.post('/microsoft', microsoftLogin);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', doResetPassword);
router.post('/register', register);
router.get('/validate', verifyToken, validateToken);
router.post('/theme', verifyToken, setTheme);

export default router;
