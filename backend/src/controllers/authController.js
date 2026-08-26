// src/controllers/authController.js
import {
  loginUser,
  requestPasswordReset,
  resetPassword,
  updateUserTheme,
  registerUser
} from '../services/authService.js';
import { loginWithMicrosoft } from '../services/microsoftAuthService.js';
import { loginWithGoogle } from '../services/googleAuthService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Direct email + password login — Admin accounts only.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const result = await loginUser(email, password);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

export const microsoftLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Microsoft ID token is required' });
  }
  const result = await loginWithMicrosoft(idToken);
  res.status(200).json({ success: true, message: 'Signed in with Microsoft', data: result });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Google ID token is required' });
  }
  const result = await loginWithGoogle(idToken);
  res.status(200).json({ success: true, message: 'Signed in with Google', data: result });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  const result = await requestPasswordReset(email);
  res.status(200).json({ success: true, message: result.message, data: result });
});

export const doResetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }
  const result = await resetPassword(resetToken, newPassword);
  res.status(200).json({ success: true, message: result.message });
});

export const setTheme = asyncHandler(async (req, res) => {
  const { theme } = req.body;
  if (!['LIGHT', 'DARK'].includes(theme)) {
    return res.status(400).json({ success: false, message: 'Theme must be LIGHT or DARK' });
  }
  const user = await updateUserTheme(req.user.userId, theme);
  res.status(200).json({ success: true, message: 'Theme updated', data: { theme: user.theme } });
});

export const register = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword, role } = req.body;

  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Email, password, and confirm password are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
  }

  const user = await registerUser(email, password, role);
  res.status(201).json({ success: true, message: 'User registered successfully', data: user });
});

export const validateToken = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Token is valid', data: req.user });
});
