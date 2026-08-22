// ============================================================
// Analytics Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getOverview, getTrends } = require('../controllers/analyticsController');

// GET /api/analytics/overview — dashboard summary stats
router.get('/overview', getOverview);

// GET /api/analytics/trends — risk score trends over time
router.get('/trends', getTrends);

module.exports = router;
