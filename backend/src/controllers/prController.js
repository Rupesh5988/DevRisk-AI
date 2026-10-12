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

    // Fetch security vulnerabilities
    const vulnResult = await pool.query(
      `SELECT id, vulnerability_type, severity, cvss_score, file_path, line_number, snippet, description, remediation, impact_score
       FROM pr_security_vulnerabilities
       WHERE pr_id = $1
       ORDER BY cvss_score DESC, id ASC`,
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
        security_score: pr.security_score || 0,
        vulnerability_count: pr.vulnerability_count || vulnResult.rows.length,
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
      security_vulnerabilities: vulnResult.rows,
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
  const limit = parseInt(req.query.limit, 10) || 100;
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
             additions, deletions, files_changed, status, github_url, created_at,
             security_score, vulnerability_count
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

/**
 * POST /api/prs/simulate
 *
 * Interactive developer sandbox endpoint. Allows simulating PR risk analysis
 * with customizable 14-feature parameters or preset profiles without needing
 * a real GitHub webhook.
 */
async function simulatePRAnalysis(req, res) {
  const mlService = require('../services/mlService');
  const securityScanner = require('../services/securityScanner');
  const { FEATURE_ORDER } = require('../utils/featureNames');

  try {
    const {
      title = 'Simulated Pull Request Change',
      author = 'developer_sandbox',
      features: rawFeatures = {},
      files = [],
      code_snippet = '',
      save_to_db = false,
      repo_id = null,
    } = req.body;

    // Normalize features to object with all 14 keys
    const features = {};
    if (Array.isArray(rawFeatures)) {
      FEATURE_ORDER.forEach((name, idx) => {
        features[name] = parseFloat(rawFeatures[idx]) || 0;
      });
    } else {
      FEATURE_ORDER.forEach((name) => {
        features[name] = parseFloat(rawFeatures[name]) || 0;
      });
    }

    // Predict risk score and label
    const prediction = await mlService.predictRisk(features);
    let riskScore = prediction.risk_score;
    let riskLabel = prediction.risk_label;

    // Fallback if ML service is unreachable
    if (riskScore < 0) {
      // Cost-sensitive weighted heuristic approximation
      const churnWeight = Math.min(40, (features.la + features.ld) / 15);
      const entropyWeight = Math.min(25, features.entropy * 12);
      const expDeduction = Math.min(30, features.exp * 0.8 + features.rexp * 1.2);
      const fixPenalty = features.fix ? 20 : 0;
      riskScore = Math.max(5, Math.min(95, Math.round(30 + churnWeight + entropyWeight + fixPenalty - expDeduction)));
      riskLabel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';
    }

    // Security scanning for code_snippet or file patches
    let securityScan = { vulnerabilities: [], security_risk_score: 0, has_critical: false };
    if (code_snippet && code_snippet.trim()) {
      const vulns = securityScanner.scanContent(code_snippet, 'simulated_change.js');
      securityScan = securityScanner.scanPRFiles([{ filename: 'simulated_change.js', patch: code_snippet }]);
    } else if (Array.isArray(files) && files.some(f => typeof f === 'object' && (f.patch || f.content))) {
      securityScan = securityScanner.scanPRFiles(files);
    }

    // Escalate risk score if security vulnerabilities found
    if (securityScan.vulnerabilities.length > 0) {
      riskScore = Math.min(98, Math.max(riskScore, securityScan.security_risk_score));
      if (riskScore >= 70 || securityScan.has_critical) {
        riskLabel = 'HIGH';
      } else if (riskScore >= 40) {
        riskLabel = 'MEDIUM';
      }
    }

    // Get SHAP explanations
    const shapExplanations = await mlService.getExplanation(features);

    // Prepend top security findings to explanations
    for (const vuln of securityScan.vulnerabilities.slice(0, 3)) {
      shapExplanations.unshift({
        feature_name: `[SECURITY] ${vuln.vulnerability_type}`,
        shap_value: (vuln.impact_score || 25) / 100,
        feature_value: vuln.cvss_score || 9.0,
        explanation: `[${vuln.severity}] ${vuln.description} (${vuln.file_path}:${vuln.line_number})`,
      });
    }

    // Build realistic dependency graph & blast radius
    let graphFiles = files.length > 0 ? (typeof files[0] === 'string' ? files : files.map(f => f.filename || 'file.js')) : [
      'src/controllers/authController.js',
      'src/services/authService.js',
      'src/models/userModel.js',
      'src/utils/tokenHelper.js',
      'src/config/database.js',
    ];

    const edges = [];
    const nodeSet = new Set(graphFiles);

    if (graphFiles.length >= 2) {
      for (let i = 0; i < graphFiles.length - 1; i++) {
        edges.push({
          source: graphFiles[i],
          target: graphFiles[i + 1],
        });
      }
      if (graphFiles.length >= 4) {
        edges.push({
          source: graphFiles[0],
          target: graphFiles[graphFiles.length - 2],
        });
      }
    }

    const blastRadius = {
      directly_modified_count: Math.min(features.nf || graphFiles.length, graphFiles.length),
      impacted_downstream_count: edges.length,
      total_affected_modules: nodeSet.size,
    };

    // Determine CI/CD Gate Verdict
    let cicdGate = {
      status: 'MERGE_APPROVED',
      badge_color: 'green',
      headline: 'Quality Gate Passed',
      reason: 'Low defect risk (<40%). Code changes meet repository stability and test coverage standards.',
    };

    if (securityScan.has_critical) {
      const maxCvss = Math.max(...securityScan.vulnerabilities.map((v) => v.cvss_score || 9.0));
      cicdGate = {
        status: 'MERGE_BLOCKED',
        badge_color: 'red',
        headline: `Merge Blocked — Critical Security Vulnerability Detected (CVSS ${maxCvss})`,
        reason: `Detected ${securityScan.vulnerabilities.length} severe security vulnerability(ies). Host execution, database exposure, or credential leakage risk identified. Quality Gate strictly blocked.`,
      };
    } else if (riskScore >= 70) {
      cicdGate = {
        status: 'MERGE_BLOCKED',
        badge_color: 'red',
        headline: 'Merge Blocked — High Defect Risk',
        reason: 'Predicted defect risk exceeds safety threshold (70%). Requires senior code review approval and passing regression tests before merge.',
      };
    } else if (riskScore >= 40) {
      cicdGate = {
        status: 'MANUAL_REVIEW_REQUIRED',
        badge_color: 'amber',
        headline: 'Peer Review Required',
        reason: 'Moderate defect risk (40%–70%). Auto-merge paused. Requires at least one peer approval addressing identified risk drivers.',
      };
    }

    // Generate actionable developer recommendations
    const recommendations = [];
    if (securityScan.vulnerabilities.length > 0) {
      securityScan.vulnerabilities.forEach((v) => {
        recommendations.push(`[SECURITY] ${v.vulnerability_type}: ${v.remediation}`);
      });
    }
    if (features.la > 300) {
      recommendations.push('Split Pull Request: Over 300 lines added. Break into smaller, atomic PRs to simplify review and lower regression risk.');
    }
    if (features.entropy > 1.2) {
      recommendations.push('Reduce Directory Spread: Edits span multiple folders. Isolate changes by architectural subsystem.');
    }
    if (features.exp < 5) {
      recommendations.push('Request Domain Review: Author is new to this repository. Request a walkthrough with a core maintainer before merging.');
    }
    if (features.fix) {
      recommendations.push('Add Regression Tests: Bug fixes have higher defect recurrence. Add unit and integration tests covering this edge case.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Safe to Merge: Change scope is clean, isolated, and within safe quality baselines.');
    }

    // Markdown formatted comment for GitHub PR
    const markdownComment = `### 🛡️ DevRisk AI Assessment: **${riskLabel} RISK (${riskScore}%)**

| Metric | Status | Evaluation |
| :--- | :--- | :--- |
| **Defect Probability** | \`${riskScore}%\` | ${riskLabel} |
| **CI/CD Quality Gate** | \`${cicdGate.status}\` | ${cicdGate.headline} |
| **Security Issues** | \`${securityScan.vulnerabilities.length} vulnerabilities\` | Score: ${securityScan.security_risk_score}% |
| **Files Impacted** | \`${blastRadius.total_affected_modules} modules\` | Blast radius reach |

#### 🔍 Top Contributing Factors:
${shapExplanations.slice(0, 3).map((e) => `- **${e.feature_name}**: ${e.explanation}`).join('\n')}

#### 💡 Actionable Next Steps:
${recommendations.map((r) => `- ${r}`).join('\n')}
`;

    // Optional database persistence
    let savedPrId = null;
    let targetRepoId = repo_id;

    if (save_to_db) {
      if (!targetRepoId) {
        const firstRepo = await pool.query('SELECT id FROM repositories ORDER BY id LIMIT 1');
        if (firstRepo.rows.length > 0) {
          targetRepoId = firstRepo.rows[0].id;
        }
      }

      if (targetRepoId) {
        const maxPr = await pool.query(
          'SELECT COALESCE(MAX(pr_number), 0) + 1 AS next_pr FROM pull_requests WHERE repo_id = $1',
          [targetRepoId]
        );
        const nextPrNumber = parseInt(maxPr.rows[0].next_pr, 10);

        const prInsert = await pool.query(
          `INSERT INTO pull_requests
           (repo_id, pr_number, title, author, risk_score, risk_label, additions, deletions, files_changed, status, github_url, security_score, vulnerability_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            targetRepoId,
            nextPrNumber,
            title,
            author,
            riskScore,
            riskLabel,
            features.la || 0,
            features.ld || 0,
            features.nf || graphFiles.length,
            'open',
            `https://github.com/simulated/pull/${nextPrNumber}`,
            securityScan.security_risk_score,
            securityScan.vulnerability_count,
          ]
        );
        savedPrId = prInsert.rows[0].id;

        // Insert pr_features
        await pool.query(
          `INSERT INTO pr_features
           (pr_id, ns, nd, nf, entropy, la, ld, lt, fix, ndev, age, nuc, exp, rexp, sexp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            savedPrId,
            features.ns || 0, features.nd || 0, features.nf || 0, features.entropy || 0,
            features.la || 0, features.ld || 0, features.lt || 0, features.fix || 0,
            features.ndev || 0, features.age || 0, features.nuc || 0, features.exp || 0,
            features.rexp || 0, features.sexp || 0,
          ]
        );

        // Insert SHAP explanations
        if (Array.isArray(shapExplanations)) {
          for (const exp of shapExplanations) {
            await pool.query(
              `INSERT INTO shap_explanations (pr_id, feature_name, shap_value, feature_value, explanation)
               VALUES ($1, $2, $3, $4, $5)`,
              [savedPrId, exp.feature_name, exp.shap_value || 0, exp.feature_value || 0, exp.explanation || '']
            );
          }
        }

        // Insert security vulnerabilities
        for (const vuln of securityScan.vulnerabilities) {
          await pool.query(
            `INSERT INTO pr_security_vulnerabilities
             (pr_id, vulnerability_type, severity, cvss_score, file_path, line_number, snippet, description, remediation, impact_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              savedPrId,
              vuln.vulnerability_type,
              vuln.severity,
              vuln.cvss_score,
              vuln.file_path,
              vuln.line_number,
              vuln.snippet,
              vuln.description,
              vuln.remediation,
              vuln.impact_score,
            ]
          );
        }

        // Insert dependency edges
        for (const edge of edges) {
          await pool.query(
            `INSERT INTO dependency_edges (repo_id, pr_id, source_file, target_file)
             VALUES ($1, $2, $3, $4)`,
            [targetRepoId, savedPrId, edge.source, edge.target]
          );
        }
      }
    }

    const responsePayload = {
      simulated_pr: {
        id: savedPrId,
        repo_id: targetRepoId,
        title,
        author,
        risk_score: riskScore,
        risk_label: riskLabel,
        security_score: securityScan.security_risk_score,
        vulnerability_count: securityScan.vulnerability_count,
        ci_cd_gate: cicdGate,
        features,
        blast_radius: blastRadius,
        recommendations,
        github_markdown_comment: markdownComment,
      },
      shap_explanations: shapExplanations,
      security_vulnerabilities: securityScan.vulnerabilities,
      dependency_graph: {
        nodes: Array.from(nodeSet),
        edges,
      },
    };

    res.json(responsePayload);
  } catch (err) {
    console.error('[PRController] Error simulating PR:', err.message);
    res.status(500).json({ error: 'Failed to simulate PR analysis', details: err.message });
  }
}

/**
 * GET /api/prs
 *
 * Global listing of analyzed pull requests with pagination,
 * risk filtering, and keyword search.
 */
async function listAllPRs(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const offset = (page - 1) * limit;
  const riskLabel = req.query.risk_label || null;
  const search = req.query.search ? req.query.search.trim() : null;
  const repoId = req.query.repo_id ? parseInt(req.query.repo_id, 10) : null;

  try {
    let query = `
      SELECT pr.id, pr.pr_number, pr.title, pr.author, pr.risk_score, pr.risk_label,
             pr.additions, pr.deletions, pr.files_changed, pr.status, pr.github_url, pr.created_at,
             pr.security_score, pr.vulnerability_count,
             r.name AS repo_name, r.owner AS repo_owner, r.id AS repo_id,
             gtr.ground_truth_status, pe.evaluation_result
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      LEFT JOIN ground_truth_records gtr ON gtr.pr_id = pr.id
      LEFT JOIN prediction_evaluations pe ON pe.pr_id = pr.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user && req.user.id) {
      params.push(req.user.id);
      query += ` AND r.user_id = $${params.length}`;
    }

    if (repoId) {
      params.push(repoId);
      query += ` AND r.id = $${params.length}`;
    }

    if (riskLabel && ['LOW', 'MEDIUM', 'HIGH'].includes(riskLabel.toUpperCase())) {
      params.push(riskLabel.toUpperCase());
      query += ` AND pr.risk_label = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pr.title ILIKE $${params.length} OR pr.author ILIKE $${params.length} OR r.name ILIKE $${params.length} OR pr.pr_number::text ILIKE $${params.length})`;
    }

    query += ` ORDER BY pr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Count query
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE 1=1
    `;
    const countParams = [];

    if (req.user && req.user.id) {
      countParams.push(req.user.id);
      countQuery += ` AND r.user_id = $${countParams.length}`;
    }

    if (repoId) {
      countParams.push(repoId);
      countQuery += ` AND r.id = $${countParams.length}`;
    }

    if (riskLabel && ['LOW', 'MEDIUM', 'HIGH'].includes(riskLabel.toUpperCase())) {
      countParams.push(riskLabel.toUpperCase());
      countQuery += ` AND pr.risk_label = $${countParams.length}`;
    }

    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (pr.title ILIKE $${countParams.length} OR pr.author ILIKE $${countParams.length} OR r.name ILIKE $${countParams.length} OR pr.pr_number::text ILIKE $${countParams.length})`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    res.json({
      pull_requests: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('[PRController] Error listing all PRs:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/prs/:id/refresh
 *
 * Re-fetches the latest code/diff from GitHub (or stored commit),
 * re-extracts the 14 change metrics, re-runs the Calibrated ML model
 * and AST security scanner, and returns consistent, true risk scores.
 */
async function reanalyzePR(req, res) {
  const { id } = req.params;
  const { processPullRequest } = require('./webhookController');
  const githubService = require('../services/githubService');

  try {
    const prResult = await pool.query(
      `SELECT pr.*, r.name AS repo_name, r.owner AS repo_owner, r.github_url AS repo_url, r.access_token
       FROM pull_requests pr
       JOIN repositories r ON pr.repo_id = r.id
       WHERE pr.id = $1`,
      [id]
    );

    if (prResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const prRow = prResult.rows[0];
    const token = prRow.access_token || process.env.GITHUB_TOKEN || null;

    // Fetch fresh PR details
    let prData = await githubService.getPRDetails(prRow.repo_owner, prRow.repo_name, prRow.pr_number, token);
    if (!prData || !prData.number) {
      prData = {
        number: prRow.pr_number,
        title: prRow.title,
        user: { login: prRow.author },
        state: prRow.status,
        html_url: prRow.github_url,
      };
    }

    const repoInfo = {
      name: prRow.repo_name,
      owner: { login: prRow.repo_owner },
      html_url: prRow.repo_url,
    };

    const mockPayload = {
      action: 'synchronize',
      pull_request: prData,
      repository: repoInfo,
    };

    // Re-execute full deterministic pipeline
    await processPullRequest(mockPayload, prRow.repo_id);

    // Call getPRById to return the updated full payload
    return getPRById(req, res);
  } catch (err) {
    console.error('[PRController] Error refreshing PR analysis:', err.message);
    res.status(500).json({ error: 'Failed to refresh PR analysis', details: err.message });
  }
}

module.exports = { getPRById, getPRsByRepo, simulatePRAnalysis, listAllPRs, reanalyzePR };

