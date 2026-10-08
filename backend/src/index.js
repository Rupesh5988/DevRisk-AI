// ============================================================
// DevRisk AI — Express Server Entry Point
// ============================================================
// This is the main application file that:
//   1. Loads environment variables
//   2. Initializes database connections (PostgreSQL + MongoDB)
//   3. Configures Express middleware
//   4. Mounts all route handlers
//   5. Starts the HTTP server
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Database connections
const { pool, initializeTables } = require('./config/database');

// Route imports
const webhookRoutes = require('./routes/webhookRoutes');
const prRoutes = require('./routes/prRoutes');
const repoRoutes = require('./routes/repoRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const groundTruthRoutes = require('./routes/groundTruthRoutes');

// ML Service health check
const mlService = require('./services/mlService');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS — allows the React frontend (port 3000) to call this API
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Vite and CRA defaults
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Request logging (concise output in dev, combined in production)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// JSON body parser with raw body capture for webhook signature verification.
// The `verify` callback saves the raw buffer before Express parses it.
app.use(express.json({
  limit: '5mb', // Webhook payloads can be large
  verify: (req, _res, buf) => {
    // Store the raw body as a Buffer for HMAC verification in webhookAuth.js
    req.rawBody = buf;
  },
}));

// ============================================================
// ROUTES
// ============================================================

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const mlHealthy = await mlService.healthCheck();
  res.json({
    status: 'ok',
    service: 'devrisk-ai-backend',
    timestamp: new Date().toISOString(),
    ml_service: mlHealthy ? 'connected' : 'unavailable',
  });
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/prs', prRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', groundTruthRoutes); // Ground Truth & Model Validation endpoints

// 404 handler for unmatched routes
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      'GET  /api/health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/me',
      'POST /api/webhook',
      'GET  /api/repos',
      'POST /api/repos',
      'GET  /api/repos/:id',
      'GET  /api/repos/:repoId/prs',
      'GET  /api/prs/:id',
      'GET  /api/analytics/overview',
      'GET  /api/analytics/trends',
    ],
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================
// SERVER STARTUP
// ============================================================

async function startServer() {
  console.log('============================================');
  console.log('   DevRisk AI — Backend Server Starting');
  console.log('============================================');

  try {
    // 1. Initialize PostgreSQL tables
    console.log('[Startup] Connecting to PostgreSQL...');
    await initializeTables();

    // 2. Check ML service availability
    console.log('[Startup] Checking ML service...');
    const mlHealthy = await mlService.healthCheck();
    if (mlHealthy) {
      console.log('[Startup] ✅ ML service is available');
    } else {
      console.warn('[Startup] ⚠️  ML service is not available — predictions will return fallback values');
    }

    // 4. Start listening
    app.listen(PORT, () => {
      console.log('============================================');
      console.log(`   ✅ Server running on http://localhost:${PORT}`);
      console.log(`   📡 Webhook URL: http://localhost:${PORT}/api/webhook`);
      console.log(`   📊 Health:      http://localhost:${PORT}/api/health`);
      console.log('============================================');
    });
  } catch (err) {
    console.error('[Startup] ❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
