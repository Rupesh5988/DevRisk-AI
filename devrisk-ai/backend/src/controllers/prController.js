// ============================================================
// Pull Request Controller
// ============================================================
// Handles API endpoints for retrieving PR analysis results,
// including risk scores, features, SHAP explanations, and
// dependency graphs.
// ============================================================

const { pool } = require('../config/database');

/**
 * GET /api/prs/:id
 *
 * Returns the full analysis report for a single Pull Request,
 * including risk score, features, SHAP explanations, and
 * dependency graph.
 */
async function getPRById(req, res) {
  const { id } = req.params;

  try {
    // Fetch the PR record
    const prResult = await pool.query(
      `SELECT pr.*, r.name AS repo_name, r.owner AS repo_owner, r.github_url AS repo_url
       FROM pull_requests pr
       JOIN repositories r ON pr.repo_id = r.id
       WHERE pr.id = $1`,
      [id]
    );

    if (prResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const pr = prResult.rows[0];

    // Fetch features
    const featuresResult = await pool.query(
      'SELECT * FROM pr_features WHERE pr_id = $1',
      [id]
    );
    const features = featuresResult.rows[0] || null;

    // Fetch SHAP explanations (sorted by absolute SHAP value — biggest contributors first)
    const shapResult = await pool.query(
      `SELECT feature_name, shap_value, feature_value, explanation
       FROM shap_explanations
       WHERE pr_id = $1
       ORDER BY ABS(shap_value) DESC`,
      [id]
    );

    // Fetch dependency graph
    const graphResult = await pool.query(
      `SELECT source_file, target_file
       FROM dependency_edges
       WHERE pr_id = $1`,
      [id]
    );

    // Build the graph node list from edges
    const nodeSet = new Set();
    const edges = graphResult.rows.map((row) => {
      nodeSet.add(row.source_file);
      nodeSet.add(row.target_file);
      return { source: row.source_file, target: row.target_file };
    });

    res.json({
      pull_request: {
        id: pr.id,
        pr_number: pr.pr_number,
        title: pr.title,
        author: pr.author,
        risk_score: pr.risk_score,
        risk_label: pr.risk_label,
        additions: pr.additions,
        deletions: pr.deletions,
        files_changed: pr.files_changed,
        status: pr.status,
        github_url: pr.github_url,
        repo_name: pr.repo_name,
        repo_owner: pr.repo_owner,
        created_at: pr.created_at,
      },
      features: features
        ? {
            ns: features.ns,
            nd: features.nd,
            nf: features.nf,
            entropy: features.entropy,
            la: features.la,
            ld: features.ld,
            lt: features.lt,
            fix: features.fix,
            ndev: features.ndev,
            age: features.age,
            nuc: features.nuc,
            exp: features.exp,
            rexp: features.rexp,
            sexp: features.sexp,
          }
        : null,
      shap_explanations: shapResult.rows,
      dependency_graph: {
        nodes: Array.from(nodeSet),
        edges,
      },
    });
  } catch (err) {
    console.error('[PRController] Error fetching PR:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/repos/:repoId/prs
 *
 * Returns all Pull Requests for a specific repository,
 * with pagination support. Sorted by most recent first.
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20)
 *   - risk_label (optional filter: 'LOW', 'MEDIUM', 'HIGH')
 */
async function getPRsByRepo(req, res) {
  const { repoId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  const riskLabel = req.query.risk_label || null;

  try {
    // Verify repository exists
    const repoCheck = await pool.query('SELECT id FROM repositories WHERE id = $1', [repoId]);
    if (repoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Build query with optional risk_label filter
    let query = `
      SELECT id, pr_number, title, author, risk_score, risk_label,
             additions, deletions, files_changed, status, github_url, created_at
      FROM pull_requests
      WHERE repo_id = $1
    `;
    const params = [repoId];

    if (riskLabel) {
      query += ' AND risk_label = $2';
      params.push(riskLabel);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM pull_requests WHERE repo_id = $1';
    const countParams = [repoId];
    if (riskLabel) {
      countQuery += ' AND risk_label = $2';
      countParams.push(riskLabel);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      pull_requests: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[PRController] Error fetching PRs:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getPRById, getPRsByRepo };
