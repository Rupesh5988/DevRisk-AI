// ============================================================
// Auth Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, verifyGithubToken, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register — Create new account
router.post('/register', register);

// POST /api/auth/login — Login and get JWT token
router.post('/login', login);

// GET /api/auth/me — Get current user profile (protected)
router.get('/me', authenticate, getMe);

// PUT /api/auth/profile — Update user full name, email, or github token (protected)
router.put('/profile', authenticate, updateProfile);

// POST /api/auth/verify-github-token — Validate a GitHub PAT against GitHub API (protected)
router.post('/verify-github-token', authenticate, verifyGithubToken);

// PUT /api/auth/password — Change current user password (protected)
router.put('/password', authenticate, changePassword);

module.exports = router;
