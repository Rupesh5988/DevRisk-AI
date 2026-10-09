// ============================================================
// Analytics Controller
// ============================================================
// Provides aggregated statistics and trend data for the
// React dashboard — overview cards, risk distribution,
// and historical trends.
// ============================================================

const { pool } = require('../config/database');

/**
 * GET /api/analytics/overview
 *
 * Returns dashboard summary statistics:
 *   - Total PRs analyzed
 *   - Average risk score
 *   - Risk distribution (count of LOW, MEDIUM, HIGH)
 *   - PRs analyzed today
 *   - ML service status
 */
async function getOverview(req, res) {
  try {
    // Total PRs
    const totalResult = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE r.user_id = $1
    `, [req.user.id]);
    const totalPRs = parseInt(totalResult.rows[0].total, 10);

    // Average risk score (exclude -1 which means ML service was unavailable)
    const avgResult = await pool.query(`
      SELECT COALESCE(ROUND(AVG(risk_score)::numeric, 1), 0) AS avg_score 
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE risk_score >= 0 AND r.user_id = $1
    `, [req.user.id]);
    const avgRiskScore = parseFloat(avgResult.rows[0].avg_score);

    // Risk distribution
    const distResult = await pool.query(`
      SELECT pr.risk_label, COUNT(*) AS count
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE pr.risk_label IS NOT NULL AND r.user_id = $1
      GROUP BY pr.risk_label
    `, [req.user.id]);
    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const row of distResult.rows) {
      distribution[row.risk_label] = parseInt(row.count, 10);
    }

    // PRs analyzed today
    const todayResult = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE pr.created_at::date = CURRENT_DATE AND r.user_id = $1
    `, [req.user.id]);
    const todayCount = parseInt(todayResult.rows[0].count, 10);

    // Top 5 riskiest PRs (recent)
    const topRiskyResult = await pool.query(`
      SELECT pr.id, pr.pr_number, pr.title, pr.author, pr.risk_score, pr.risk_label,
             r.name AS repo_name, r.owner AS repo_owner
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE pr.risk_score >= 0 AND r.user_id = $1
      ORDER BY pr.risk_score DESC
      LIMIT 5
    `, [req.user.id]);

    // Most recent PRs
    const recentResult = await pool.query(`
      SELECT pr.id, pr.pr_number, pr.title, pr.author, pr.risk_score, pr.risk_label,
             pr.additions, pr.deletions, pr.files_changed, pr.created_at,
             r.name AS repo_name, r.owner AS repo_owner,
             gtr.ground_truth_status, pe.evaluation_result
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      LEFT JOIN ground_truth_records gtr ON gtr.pr_id = pr.id
      LEFT JOIN prediction_evaluations pe ON pe.pr_id = pr.id
      WHERE r.user_id = $1
      ORDER BY pr.created_at DESC
      LIMIT 10
    `, [req.user.id]);

    // Repositories count
    const repoCountResult = await pool.query(
      'SELECT COUNT(*) AS total FROM repositories WHERE user_id = $1',
      [req.user.id]
    );
    const totalRepos = parseInt(repoCountResult.rows[0].total, 10) || 0;

    res.json({
      summary: {
        total_prs: totalPRs,
        avg_risk_score: avgRiskScore,
        prs_today: todayCount,
        repositories_tracked: totalRepos,
      },
      risk_distribution: distribution,
      top_risky_prs: topRiskyResult.rows,
      recent_prs: recentResult.rows,
    });
  } catch (err) {
    require('fs').writeFileSync('crash.log', err.stack);
    console.error('[AnalyticsController] Error fetching overview:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/analytics/trends
 *
 * Returns risk score trends over time for charting.
 * Groups PRs by date and returns daily averages.
 *
 * Query params:
 *   - days (default: 30) — how many days of history to return
 *   - repo_id (optional) — filter to a specific repository
 */
async function getTrends(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  const repoId = req.query.repo_id || null;

  try {
    let query = `
      SELECT
        pr.created_at::date AS date,
        COUNT(*) AS pr_count,
        ROUND(AVG(pr.risk_score)::numeric, 1) AS avg_risk,
        MAX(pr.risk_score) AS max_risk,
        MIN(pr.risk_score) AS min_risk,
        COUNT(CASE WHEN pr.risk_label = 'HIGH' THEN 1 END) AS high_count,
        COUNT(CASE WHEN pr.risk_label = 'MEDIUM' THEN 1 END) AS medium_count,
        COUNT(CASE WHEN pr.risk_label = 'LOW' THEN 1 END) AS low_count
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      WHERE pr.created_at >= NOW() - INTERVAL '${days} days'
        AND pr.risk_score >= 0
        AND r.user_id = $1
    `;

    const params = [req.user.id];
    if (repoId) {
      query += ' AND pr.repo_id = $2';
      params.push(repoId);
    }

    query += ' GROUP BY pr.created_at::date ORDER BY date ASC';

    const result = await pool.query(query, params);

    res.json({
      period_days: days,
      trends: result.rows,
    });
  } catch (err) {
    console.error('[AnalyticsController] Error fetching trends:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getOverview, getTrends };
