// ============================================================
// JWT Authentication Middleware
// ============================================================
// Verifies the Bearer token from the Authorization header.
// If valid, attaches req.user = { id, username, email }.
// ============================================================

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Protect routes — requires a valid JWT token.
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, full_name, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found. Token is invalid.' });
    }

    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    console.error('[Auth] Error:', err.message);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

/**
 * Optional auth — attaches user if token exists, but doesn't block.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, username, email, full_name FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
  } catch (err) {
    // Token invalid — silently continue without user
  }
  next();
}

module.exports = { authenticate, optionalAuth };
