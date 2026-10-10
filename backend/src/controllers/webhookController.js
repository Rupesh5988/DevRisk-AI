// ============================================================
// Webhook Controller
// ============================================================
// Handles incoming GitHub webhook events for Pull Requests.
// This is the MAIN ORCHESTRATOR — it coordinates the entire
// pipeline: log → extract features → parse deps → predict → store.
// ============================================================

const { pool } = require('../config/database');
const githubService = require('../services/githubService');
const { extractFeatures } = require('../services/featureExtractor');
const { buildDependencyGraph, isJSFile } = require('../services/dependencyParser');
const mlService = require('../services/mlService');
const { FEATURE_ORDER, getRiskLabel } = require('../utils/featureNames');

/**
 * POST /api/webhook
 *
 * Called by GitHub when a PR is opened, updated (synchronized),
 * or reopened. Processes the event through the full pipeline.
 */
async function handleWebhook(req, res) {
  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];
  const payload = req.body;

  console.log(`[Webhook] Received event: ${event}, delivery: ${deliveryId}`);

  // (Step 0: MongoDB logging removed)

  // -------------------------------------------------------
  // Step 1: Filter — only process pull_request events
  // -------------------------------------------------------
  if (event !== 'pull_request') {
    console.log(`[Webhook] Ignoring non-PR event: ${event}`);
    return res.status(200).json({ status: 'ignored', reason: `Event type '${event}' is not processed` });
  }

  // Only process when a PR is opened, updated, or reopened
  const validActions = ['opened', 'synchronize', 'reopened'];
  if (!validActions.includes(payload.action)) {
    console.log(`[Webhook] Ignoring PR action: ${payload.action}`);
    return res.status(200).json({ status: 'ignored', reason: `PR action '${payload.action}' is not processed` });
  }

  // Respond to GitHub immediately (they expect a response within 10 seconds)
  res.status(202).json({ status: 'accepted', message: 'Processing PR analysis in background' });

  // -------------------------------------------------------
  // Step 2: Process the PR asynchronously (after responding)
  // -------------------------------------------------------
  try {
    await processPullRequest(payload);
  } catch (err) {
    console.error('[Webhook] PR processing failed:', err);
  }
}

/**
 * Core processing pipeline for a Pull Request event.
 * This runs AFTER the webhook response has been sent.
 */
async function processPullRequest(payload, targetRepoId = null) {
  const pr = payload.pull_request;
  const repoData = payload.repository;
  const owner = repoData.owner.login;
  const repo = repoData.name;
  const prNumber = pr.number;

  console.log(`[Webhook] Processing PR #${prNumber} on ${owner}/${repo}`);

  // -------------------------------------------------------
  // Step 2a: Ensure repository exists in our database
  // -------------------------------------------------------
  let repoRows = [];
  
  if (targetRepoId) {
    const existingRepo = await pool.query('SELECT * FROM repositories WHERE id = $1', [targetRepoId]);
    if (existingRepo.rows.length > 0) repoRows = existingRepo.rows;
  } else {
    const existingRepos = await pool.query('SELECT * FROM repositories WHERE github_url = $1', [repoData.html_url]);
    repoRows = existingRepos.rows;
  }

  if (repoRows.length === 0) {
    // If no specific repo was found (e.g. they added webhook before adding in UI), just insert a generic one
    const insertResult = await pool.query(
      `INSERT INTO repositories (github_url, name, owner, language)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [repoData.html_url, repo, owner, repoData.language || null]
    );
    repoRows = [insertResult.rows[0]];
    console.log(`[Webhook] New repository registered: ${owner}/${repo}`);
  }

  // Determine repository token (from repository's access_token or global GITHUB_TOKEN)
  const repoToken = repoRows[0]?.access_token || process.env.GITHUB_TOKEN || null;

  // -------------------------------------------------------
  // Step 2b: Fetch PR details and files from GitHub API
  // -------------------------------------------------------
  let prDetails = null;
  let prFiles = [];

  if (pr.is_from_commit) {
    prDetails = pr;
    prFiles = pr.files || [];
  } else {
    prDetails = await githubService.getPRDetails(owner, repo, prNumber, repoToken);
    prFiles = await githubService.getPRFiles(owner, repo, prNumber, prDetails, repoToken);
  }

  console.log(`[Webhook] PR #${prNumber}: ${prFiles.length} files changed, +${pr.additions || prDetails.additions || 0}/-${pr.deletions || prDetails.deletions || 0}`);

  // -------------------------------------------------------
  // Step 2c: Extract the 14 change-pattern features
  // -------------------------------------------------------
  const features = await extractFeatures(owner, repo, prNumber, prDetails, prFiles, repoToken);

  // -------------------------------------------------------
  // Step 2d: Parse dependency graph (JS/Node.js repos only)
  // -------------------------------------------------------
  const hasJSFiles = prFiles.some((f) => isJSFile(f.filename));
  let dependencyGraph = { nodes: [], edges: [] };

  if (hasJSFiles) {
    const ref = pr.head ? pr.head.sha : undefined;
    dependencyGraph = await buildDependencyGraph(owner, repo, prFiles, ref, repoToken);
  }

  // -------------------------------------------------------
  // Step 2e: Call the Python ML service for prediction
  // -------------------------------------------------------
  const prediction = await mlService.predictRisk(features);
  const riskScore = prediction.risk_score;
  const riskLabel = prediction.risk_label;

  console.log(`[Webhook] PR #${prNumber} → Risk: ${riskScore}% (${riskLabel})`);

  // -------------------------------------------------------
  // Step 2f: Get SHAP explanations
  // -------------------------------------------------------
  let explanations = [];
  if (riskScore >= 0) {
    // Only request explanations if ML service was available
    explanations = await mlService.getExplanation(features);
  }

  // -------------------------------------------------------
  // -------------------------------------------------------
  // Step 2g: Store everything in PostgreSQL
  // -------------------------------------------------------
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const repoRow of repoRows) {
      // Upsert the Pull Request record for this specific repo_id
      const prResult = await client.query(
        `INSERT INTO pull_requests (repo_id, pr_number, title, author, risk_score, risk_label,
                                     additions, deletions, files_changed, status, github_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (repo_id, pr_number)
         DO UPDATE SET risk_score = $5, risk_label = $6, additions = $7, deletions = $8,
                       files_changed = $9, title = $3, status = $10
         RETURNING id`,
        [
          repoRow.id,
          prNumber,
          pr.title,
          pr.user.login,
          riskScore,
          riskLabel,
          pr.additions || 0,
          pr.deletions || 0,
          prFiles.length,
          pr.state || 'open',
          pr.html_url,
        ]
      );
      const prId = prResult.rows[0].id;

      // Upsert features
      await client.query(
        `INSERT INTO pr_features (pr_id, ns, nd, nf, entropy, la, ld, lt, fix, ndev, age, nuc, exp, rexp, sexp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (pr_id)
         DO UPDATE SET ns=$2, nd=$3, nf=$4, entropy=$5, la=$6, ld=$7, lt=$8, fix=$9,
                       ndev=$10, age=$11, nuc=$12, exp=$13, rexp=$14, sexp=$15`,
        [prId, features.ns, features.nd, features.nf, features.entropy, features.la,
         features.ld, features.lt, features.fix, features.ndev, features.age,
         features.nuc, features.exp, features.rexp, features.sexp]
      );

      // Delete old SHAP explanations and insert new ones
      await client.query('DELETE FROM shap_explanations WHERE pr_id = $1', [prId]);
      for (const expl of explanations) {
        await client.query(
          `INSERT INTO shap_explanations (pr_id, feature_name, shap_value, feature_value, explanation)
           VALUES ($1, $2, $3, $4, $5)`,
          [prId, expl.feature_name, expl.shap_value, expl.feature_value, expl.explanation]
        );
      }

      // Delete old dependency edges and insert new ones
      await client.query('DELETE FROM dependency_edges WHERE pr_id = $1', [prId]);
      for (const edge of dependencyGraph.edges) {
        await client.query(
          `INSERT INTO dependency_edges (repo_id, pr_id, source_file, target_file)
           VALUES ($1, $2, $3, $4)`,
          [repoRow.id, prId, edge.source, edge.target]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`[Webhook] PR #${prNumber} — all data stored successfully for ${repoRows.length} repo(s)`);
  } catch (dbErr) {
    await client.query('ROLLBACK');
    console.error('[Webhook] Database transaction failed:', dbErr.message);
    throw dbErr;
  } finally {
    client.release();
  }

  // (Step 2h: Webhook log update removed)

  console.log(`[Webhook] ✅ PR #${prNumber} fully processed — Risk: ${riskScore}% (${riskLabel})`);
}

module.exports = { handleWebhook, processPullRequest };
