// ============================================================
// Pull Request Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { getPRById, getPRsByRepo } = require('../controllers/prController');

// GET /api/prs/:id — full analysis report for a single PR
router.get('/:id', getPRById);

// GET /api/repos/:repoId/prs — all PRs for a repository (paginated)
// NOTE: This route is mounted under /api/repos in the repo routes,
//       but we also expose it here for convenience.
//       The repoRoutes.js file imports and uses getPRsByRepo directly.

module.exports = router;
