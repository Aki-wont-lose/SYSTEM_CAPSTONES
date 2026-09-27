// modules/auth/routes.js
import express from 'express';
import { login, microsoftLogin, forgotPassword, doResetPassword, setTheme, register, validateToken, doChangePassword } from '../../controllers/authController.js';
import { verifyToken } from '../../middleware/auth.js';

const router = express.Router();

// Staff + admin-issued student accounts use email/password; students may also use Microsoft
router.post('/login', login);
router.post('/microsoft', microsoftLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', doResetPassword);
router.post('/register', register);
router.get('/validate', verifyToken, validateToken);
router.post('/theme', verifyToken, setTheme);
router.post('/change-password', verifyToken, doChangePassword);

export default router;
