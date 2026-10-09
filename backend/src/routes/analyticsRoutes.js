// ============================================================
// Analytics Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getOverview, getTrends } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

// All analytics routes require authentication
router.use(authenticate);

// GET /api/analytics/overview — dashboard summary stats
router.get('/overview', getOverview);

// GET /api/analytics/trends — risk score trends over time
router.get('/trends', getTrends);

module.exports = router;
