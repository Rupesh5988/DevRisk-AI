// ============================================================
// Auth Controller — Register, Login, Get Me
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const githubService = require('../services/githubService');

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 * Create a new user account.
 */
async function register(req, res) {
  try {
    const { username, email, password, full_name } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name, created_at`,
      [username, email, password_hash, full_name || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    console.log(`[Auth] New user registered: ${username} (${email})`);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: null,
        engineering_role: 'Developer',
        github_username: user.username,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT id, username, email, password_hash, full_name, avatar_url, engineering_role, github_username, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    console.log(`[Auth] User logged in: ${user.username}`);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url || null,
        engineering_role: user.engineering_role || 'Developer',
        github_username: user.github_username || user.username,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 */
async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, u.engineering_role, u.github_username, u.github_token, u.created_at,
              COUNT(r.id) AS repo_count
       FROM users u
       LEFT JOIN repositories r ON r.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[Auth] getMe error:', err.message);
    res.status(500).json({ error: 'Failed to get user profile.' });
  }
}

/**
 * PUT /api/auth/profile
 * Update user full_name, email, github_token, avatar_url, engineering_role, or github_username.
 */
async function updateProfile(req, res) {
  try {
    const { full_name, email, github_token, avatar_url, engineering_role, github_username } = req.body;

    // Check if email is already in use by another account
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email is already in use by another account.' });
      }
    }

    // Determine token update behavior:
    // If github_token is present in req.body, allow updating to string or clearing to NULL
    const tokenProvided = github_token !== undefined;
    const cleanToken = github_token && github_token.trim() ? github_token.trim() : null;

    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           github_token = CASE WHEN $3 = TRUE THEN $4 ELSE github_token END,
           avatar_url = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE avatar_url END,
           engineering_role = COALESCE($6, engineering_role),
           github_username = COALESCE($7, github_username)
       WHERE id = $8
       RETURNING id, username, email, full_name, avatar_url, engineering_role, github_username, github_token, created_at`,
      [
        full_name,
        email,
        tokenProvided,
        cleanToken,
        avatar_url === '' ? null : avatar_url,
        engineering_role,
        github_username,
        req.user.id
      ]
    );

    res.json({
      message: 'Profile updated successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('[Auth] updateProfile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

/**
 * POST /api/auth/verify-github-token
 * Validates a GitHub Personal Access Token against the GitHub API.
 */
async function verifyGithubToken(req, res) {
  try {
    const tokenToTest = (req.body?.token && req.body.token.trim()) || req.user?.github_token || null;
    if (!tokenToTest) {
      return res.status(400).json({ error: 'No Personal Access Token provided to test.' });
    }

    const info = await githubService.verifyToken(tokenToTest);
    return res.json({
      valid: true,
      username: info.login,
      name: info.name,
      avatar_url: info.avatar_url,
      scopes: info.scopes,
      message: `Token verified successfully for GitHub user @${info.login} (Scopes: ${info.scopes || 'default'})`,
    });
  } catch (err) {
    return res.status(400).json({
      valid: false,
      error: err.response?.data?.message || err.message || 'Invalid GitHub Personal Access Token.',
    });
  }
}

/**
 * PUT /api/auth/password
 * Change current user password.
 */
async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[Auth] changePassword error:', err.message);
    res.status(500).json({ error: 'Failed to update password.' });
  }
}

module.exports = { register, login, getMe, updateProfile, verifyGithubToken, changePassword };
