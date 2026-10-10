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
        (r.access_token IS NOT NULL AND r.access_token != '') AS is_private,
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
 * Adds a new GitHub repository to track (Public or Private).
 * Body: { github_url: "https://github.com/owner/repo", access_token?: "ghp_xxx" }
 */
async function addRepo(req, res) {
  const { github_url, access_token } = req.body;

  if (!github_url) {
    return res.status(400).json({ error: 'github_url is required' });
  }

  // Parse owner and repo from the GitHub URL
  const urlPattern = /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/?$/;
  const match = github_url.match(urlPattern);

  if (!match) {
    return res.status(400).json({
      error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo',
    });
  }

  const owner = match[1];
  const repo = match[2].replace('.git', '');

  const cleanToken = access_token && access_token.trim() ? access_token.trim() : null;

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

    // Verify the repository exists on GitHub with smart public/private detection
    let repoInfo;
    if (cleanToken) {
      try {
        repoInfo = await githubService.getRepoInfo(owner, repo, cleanToken);
      } catch (ghErr) {
        return res.status(400).json({
          error: `Could not access private repository with provided token: ${ghErr.message}`,
          token_invalid: true,
          is_private: true,
        });
      }
    } else {
      try {
        repoInfo = await githubService.getRepoInfo(owner, repo, null);
      } catch (ghErr) {
        return res.status(400).json({
          error: 'This repository appears to be private or requires authentication.',
          requires_token: true,
          is_private: true,
          message: 'Private repository detected. Please enter a Personal Access Token (PAT) with repo scope.',
        });
      }
    }

    // Insert into database with access_token
    const result = await pool.query(
      `INSERT INTO repositories (user_id, github_url, name, owner, language, access_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, repoInfo.html_url, repo, owner, repoInfo.language || null, cleanToken]
    );

    const newRepo = result.rows[0];
    console.log(`[RepoController] Repository added: ${owner}/${repo} (Private: ${cleanToken ? 'YES' : 'NO'})`);

    // --- BACKGROUND SYNC ---
    setTimeout(async () => {
      try {
        console.log(`[RepoController] Starting background sync for ${owner}/${repo}...`);
        const { processPullRequest } = require('./webhookController');
        let recentPRs = await githubService.getRecentPRs(owner, repo, 100, cleanToken).catch(() => []);
        if (!recentPRs || recentPRs.length === 0) {
          recentPRs = await githubService.getRecentCommitsAsPRs(owner, repo, 100, cleanToken).catch(() => []);
        }
        
        for (const pr of recentPRs) {
          const mockPayload = {
            action: 'opened',
            pull_request: pr,
            repository: repoInfo,
          };
          await processPullRequest(mockPayload, newRepo.id).catch(err => {
             console.error(`[RepoController] Background sync failed for PR #${pr.number}:`, err.message);
          });
        }
        console.log(`[RepoController] Background sync complete for ${owner}/${repo} (${recentPRs.length} items synced)`);
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
        r.id,
        r.user_id,
        r.github_url,
        r.name,
        r.owner,
        r.language,
        r.created_at,
        (r.access_token IS NOT NULL AND r.access_token != '') AS is_private,
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
  const { access_token } = req.body || {};

  try {
    const result = await pool.query(
      'SELECT id, owner, name, access_token FROM repositories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { owner, name: repo } = result.rows[0];
    let repoToken = result.rows[0].access_token;

    // If an updated token was provided in the sync request, save it
    if (access_token && access_token.trim()) {
      repoToken = access_token.trim();
      await pool.query(
        'UPDATE repositories SET access_token = $1 WHERE id = $2',
        [repoToken, id]
      );
      console.log(`[RepoController] Updated access token for ${owner}/${repo}`);
    }

    const { processPullRequest } = require('./webhookController');
    let recentPRs = [];
    let isFromCommits = false;

    try {
      recentPRs = await githubService.getRecentPRs(owner, repo, 100, repoToken);
    } catch (authErr) {
      console.warn(`[RepoController] Auth error during getRecentPRs:`, authErr.message);
      return res.status(401).json({ error: authErr.message });
    }

    // If 0 PRs found in GitHub's PR API, automatically fall back to recent commits & merge PRs!
    if (!recentPRs || recentPRs.length === 0) {
      try {
        console.log(`[RepoController] 0 official GitHub PRs found for ${owner}/${repo}. Falling back to recent commits / merge PRs...`);
        recentPRs = await githubService.getRecentCommitsAsPRs(owner, repo, 100, repoToken);
        if (recentPRs && recentPRs.length > 0) {
          isFromCommits = true;
        }
      } catch (commitErr) {
        if (commitErr.message.includes('Authentication Failed') || commitErr.message.includes('Access Denied')) {
          return res.status(401).json({ error: commitErr.message });
        }
        console.warn(`[RepoController] Commit sync fallback error:`, commitErr.message);
      }
    }

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
        await processPullRequest(mockPayload, id);
        syncedCount++;
      } catch (err) {
        console.error(`[RepoController] Sync failed for PR #${pr.number}:`, err.message);
      }
    }

    if (syncedCount === 0) {
      return res.json({
        message: 'No Pull Requests or Commits found in this repository. Ensure your PAT is valid and has "repo" scope.',
        synced_count: 0
      });
    }

    const syncMsg = isFromCommits
      ? `Successfully synced and evaluated ${syncedCount} Pull Requests & Merged Commits.`
      : `Successfully synced ${syncedCount} Pull Requests.`;

    res.json({ message: syncMsg, synced_count: syncedCount });
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

/**
 * POST /api/repos/check-visibility
 *
 * Probes GitHub to determine whether a repo is Public or Private.
 * Body: { github_url: "owner/repo", access_token?: "ghp_xxx" }
 */
async function checkRepoVisibility(req, res) {
  const { github_url, access_token } = req.body;
  if (!github_url || !github_url.trim()) {
    return res.status(400).json({ error: 'github_url is required' });
  }

  const trimmed = github_url.trim();
  const urlPattern = /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/?$/;
  let match = trimmed.match(urlPattern);
  let owner, repo;
  if (match) {
    owner = match[1];
    repo = match[2].replace(/\.git$/, '');
  } else {
    const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (shortMatch) {
      owner = shortMatch[1];
      repo = shortMatch[2].replace(/\.git$/, '');
    } else {
      return res.status(400).json({ error: 'Invalid repository format' });
    }
  }

  const cleanToken = access_token && access_token.trim() ? access_token.trim() : null;

  // 1. Check anonymously first
  try {
    const pubInfo = await githubService.getRepoInfo(owner, repo, null);
    return res.json({
      is_private: false,
      requires_token: false,
      owner,
      repo,
      name: pubInfo.name || repo,
      language: pubInfo.language,
      stars: pubInfo.stargazers_count,
      description: pubInfo.description,
      message: 'Public repository detected. Ready to connect!',
    });
  } catch (pubErr) {
    // 2. Anonymous failed (404/403) -> Private or requires token
    if (cleanToken) {
      try {
        const privInfo = await githubService.getRepoInfo(owner, repo, cleanToken);
        return res.json({
          is_private: true,
          requires_token: false,
          token_valid: true,
          owner,
          repo,
          name: privInfo.name || repo,
          language: privInfo.language,
          message: 'Private repository verified with Personal Access Token.',
        });
      } catch (tokErr) {
        return res.json({
          is_private: true,
          requires_token: true,
          token_valid: false,
          error: 'Invalid Personal Access Token or repository not accessible.',
        });
      }
    }

    return res.json({
      is_private: true,
      requires_token: true,
      owner,
      repo,
      message: 'Private repository detected. Personal Access Token (PAT) is required.',
    });
  }
}

/**
 * PUT /api/repos/:id/token
 *
 * Updates the Personal Access Token for a tracked repository.
 */
async function updateRepoToken(req, res) {
  const { id } = req.params;
  const { access_token } = req.body;

  const cleanToken = access_token && access_token.trim() ? access_token.trim() : null;

  try {
    const existing = await pool.query(
      'SELECT id, owner, name FROM repositories WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { owner, name: repo } = existing.rows[0];

    // If a token is provided, verify it works against GitHub
    if (cleanToken) {
      try {
        await githubService.getRepoInfo(owner, repo, cleanToken);
      } catch (err) {
        return res.status(400).json({ error: `Invalid GitHub token or repository inaccessible: ${err.message}` });
      }
    }

    await pool.query(
      'UPDATE repositories SET access_token = $1 WHERE id = $2',
      [cleanToken, id]
    );

    res.json({ message: 'Personal Access Token updated successfully.' });
  } catch (err) {
    console.error('[RepoController] Error updating token:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listRepos, addRepo, getRepoById, syncRepo, deleteRepo, checkRepoVisibility, updateRepoToken };
