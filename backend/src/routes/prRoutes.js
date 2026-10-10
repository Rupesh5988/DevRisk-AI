// ============================================================
// Pull Request Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getPRById, getPRsByRepo, simulatePRAnalysis, listAllPRs } = require('../controllers/prController');
const { optionalAuth } = require('../middleware/auth');

// GET /api/prs — global paginated list of all analyzed pull requests
router.get('/', optionalAuth, listAllPRs);

// POST /api/prs/simulate — interactive developer sandbox PR analysis
router.post('/simulate', simulatePRAnalysis);

// GET /api/prs/:id — full analysis report for a single PR
router.get('/:id', getPRById);

// GET /api/repos/:repoId/prs — all PRs for a repository (paginated)
// NOTE: This route is mounted under /api/repos in the repo routes,
//       but we also expose it here for convenience.
//       The repoRoutes.js file imports and uses getPRsByRepo directly.

module.exports = router;
