// ============================================================
// Repository Controller
// ============================================================
// Handles CRUD operations for tracked repositories.
// Users can add GitHub repos to track, list all tracked repos,
// and get details for a specific repo.
// ============================================================

const { pool } = require('../config/database');
const githubService = require('../services/githubService');

/**
 * GET /api/repos
 *
 * Returns all tracked repositories with their PR counts
 * and average risk scores.
 */
async function listRepos(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        r.id,
        r.github_url,
        r.name,
        r.owner,
        r.language,
        r.created_at,
        COUNT(pr.id) AS total_prs,
        COALESCE(ROUND(AVG(pr.risk_score)::numeric, 1), 0) AS avg_risk_score,
        COUNT(CASE WHEN pr.risk_label = 'HIGH' THEN 1 END) AS high_risk_count
      FROM repositories r
      LEFT JOIN pull_requests pr ON r.id = pr.repo_id
      WHERE r.user_id = $1
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json({ repositories: result.rows });
  } catch (err) {
    console.error('[RepoController] Error listing repos:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/repos
 *
 * Adds a new GitHub repository to track.
 * Validates the repo exists on GitHub before adding.
 *
 * Body: { github_url: "https://github.com/owner/repo" }
 */
async function addRepo(req, res) {
  const { github_url } = req.body;

  if (!github_url) {
    return res.status(400).json({ error: 'github_url is required' });
  }

  // Parse owner and repo from the GitHub URL
  // Accepts: https://github.com/owner/repo or github.com/owner/repo
  const urlPattern = /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/?$/;
  const match = github_url.match(urlPattern);

  if (!match) {
    return res.status(400).json({
      error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo',
    });
  }

  const owner = match[1];
  const repo = match[2].replace('.git', ''); // Remove .git suffix if present

  try {
    // Check if already tracked by THIS user
    const existing = await pool.query(
      'SELECT * FROM repositories WHERE user_id = $1 AND owner = $2 AND name = $3',
      [req.user.id, owner, repo]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'You are already tracking this repository',
        repository: existing.rows[0],
      });
    }

    // Verify the repository exists on GitHub with resilient fallback
    let repoInfo;
    try {
      repoInfo = await githubService.getRepoInfo(owner, repo);
    } catch (ghErr) {
      console.warn(`[RepoController] GitHub lookup failed (${ghErr.message}), creating tracked entry with URL metadata`);
      repoInfo = {
        html_url: `https://github.com/${owner}/${repo}`,
        language: 'JavaScript',
      };
    }

    // Insert into database
    const result = await pool.query(
      `INSERT INTO repositories (user_id, github_url, name, owner, language)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, repoInfo.html_url, repo, owner, repoInfo.language || null]
    );

    console.log(`[RepoController] Repository added: ${owner}/${repo}`);

    // --- BACKGROUND SYNC ---
    // Fetch the latest 5 PRs and process them in the background
    // so the dashboard isn't empty immediately after adding.
    setTimeout(async () => {
      try {
        console.log(`[RepoController] Starting background sync for ${owner}/${repo}...`);
        const { processPullRequest } = require('./webhookController');
        const recentPRs = await githubService.getRecentPRs(owner, repo, 5);
        
        for (const pr of recentPRs) {
          // Construct a mock webhook payload
          const mockPayload = {
            action: 'opened',
            pull_request: pr,
            repository: repoInfo,
          };
          await processPullRequest(mockPayload, null).catch(err => {
             console.error(`[RepoController] Background sync failed for PR #${pr.number}:`, err.message);
          });
        }
        console.log(`[RepoController] Background sync complete for ${owner}/${repo}`);
      } catch (syncErr) {
        console.error(`[RepoController] Failed to start background sync:`, syncErr.message);
      }
    }, 0);

    res.status(201).json({
      message: 'Repository added successfully. Fetching recent Pull Requests in the background...',
      repository: result.rows[0],
      webhook_hint: `Configure a webhook at ${repoInfo.html_url}/settings/hooks with URL: YOUR_SERVER_URL/api/webhook`,
    });
  } catch (err) {
    console.error('[RepoController] Error adding repo:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/repos/:id
 *
 * Returns details for a specific tracked repository.
 */
async function getRepoById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
        r.*,
        COUNT(pr.id) AS total_prs,
        COALESCE(ROUND(AVG(pr.risk_score)::numeric, 1), 0) AS avg_risk_score,
        COUNT(CASE WHEN pr.risk_label = 'HIGH' THEN 1 END) AS high_risk_count,
        COUNT(CASE WHEN pr.risk_label = 'MEDIUM' THEN 1 END) AS medium_risk_count,
        COUNT(CASE WHEN pr.risk_label = 'LOW' THEN 1 END) AS low_risk_count
      FROM repositories r
      LEFT JOIN pull_requests pr ON r.id = pr.repo_id
      WHERE r.id = $1 AND r.user_id = $2
      GROUP BY r.id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({ repository: result.rows[0] });
  } catch (err) {
    console.error('[RepoController] Error fetching repo:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/repos/:id/sync
 *
 * Manually fetches recent PRs for a repository and processes them.
 */
async function syncRepo(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT owner, name FROM repositories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { owner, name: repo } = result.rows[0];
    const { processPullRequest } = require('./webhookController');
    const recentPRs = await githubService.getRecentPRs(owner, repo, 10);

    const repoInfo = {
      html_url: `https://github.com/${owner}/${repo}`,
      language: 'JavaScript',
      name: repo,
      owner: { login: owner }
    };

    let syncedCount = 0;
    for (const pr of recentPRs) {
      const mockPayload = {
        action: 'opened', // Force a risk assessment
        pull_request: pr,
        repository: repoInfo,
      };
      
      try {
        await processPullRequest(mockPayload, null);
        syncedCount++;
      } catch (err) {
        console.error(`[RepoController] Sync failed for PR #${pr.number}:`, err.message);
      }
    }

    res.json({ message: `Successfully synced ${syncedCount} Pull Requests.` });
  } catch (err) {
    console.error('[RepoController] Error syncing repo:', err.message);
    res.status(500).json({ error: 'Internal server error during sync' });
  }
}

/**
 * DELETE /api/repos/:id
 *
 * Deletes a tracked repository.
 */
async function deleteRepo(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM repositories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({ message: 'Repository deleted successfully' });
  } catch (err) {
    console.error('[RepoController] Error deleting repo:', err.message);
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
}

module.exports = { listRepos, addRepo, getRepoById, syncRepo, deleteRepo };
