// ============================================================
// Auth Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register — Create new account
router.post('/register', register);

// POST /api/auth/login — Login and get JWT token
router.post('/login', login);

// GET /api/auth/me — Get current user profile (protected)
router.get('/me', authenticate, getMe);

module.exports = router;
