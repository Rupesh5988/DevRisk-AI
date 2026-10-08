// ============================================================
// Repository Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { listRepos, addRepo, getRepoById } = require('../controllers/repoController');
const { getPRsByRepo } = require('../controllers/prController');
const { authenticate } = require('../middleware/auth');

// All repo routes require authentication
router.use(authenticate);

// GET /api/repos — list user's tracked repositories
router.get('/', listRepos);

// POST /api/repos — add a new repository to track
router.post('/', addRepo);

// GET /api/repos/:id — get details for a specific repository
router.get('/:id', getRepoById);

// GET /api/repos/:repoId/prs — all PRs for a repository (paginated)
router.get('/:repoId/prs', getPRsByRepo);

module.exports = router;
