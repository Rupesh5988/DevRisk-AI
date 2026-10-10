// ============================================================
// Repository Routes
// ============================================================

const express = require('express');
const router = express.Router();
const { listRepos, addRepo, getRepoById, syncRepo, deleteRepo, checkRepoVisibility, updateRepoToken } = require('../controllers/repoController');
const { getPRsByRepo } = require('../controllers/prController');
const { authenticate } = require('../middleware/auth');

// All repo routes require authentication
router.use(authenticate);

// POST /api/repos/check-visibility — detect if repository is public or private
router.post('/check-visibility', checkRepoVisibility);

// GET /api/repos — list user's tracked repositories
router.get('/', listRepos);

// POST /api/repos — add a new repository to track
router.post('/', addRepo);

// GET /api/repos/:id — get details for a specific repository
router.get('/:id', getRepoById);

// PUT /api/repos/:id/token — update PAT token for a repository
router.put('/:id/token', updateRepoToken);

// POST /api/repos/:id/sync — manually sync recent PRs from GitHub
router.post('/:id/sync', syncRepo);

// DELETE /api/repos/:id — delete a tracked repository
router.delete('/:id', deleteRepo);

// GET /api/repos/:repoId/prs — all PRs for a repository (paginated)
router.get('/:repoId/prs', getPRsByRepo);

module.exports = router;
