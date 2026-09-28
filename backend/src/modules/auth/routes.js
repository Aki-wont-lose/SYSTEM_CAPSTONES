// modules/auth/routes.js
import express from 'express';
import { login, microsoftLogin, forgotPassword, doResetPassword, setTheme, validateToken, doChangePassword } from '../../controllers/authController.js';
import { verifyToken } from '../../middleware/auth.js';

const router = express.Router();

// Staff + admin-issued student accounts use email/password; students may also use Microsoft
router.post('/login', login);
router.post('/microsoft', microsoftLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', doResetPassword);
// NOTE: self-registration is intentionally not exposed. Accounts are issued by an
// ADMIN through /api/accounts. A public /register that accepts a client-supplied
// role allowed unauthenticated ADMIN creation.
router.get('/validate', verifyToken, validateToken);
router.post('/theme', verifyToken, setTheme);
router.post('/change-password', verifyToken, doChangePassword);

export default router;
