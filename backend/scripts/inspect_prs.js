const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'devrisk_ai',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT, 10) || 5432,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT pr.id, pr.pr_number, pr.title, pr.risk_score, pr.risk_label, r.name as repo_name, r.owner
      FROM pull_requests pr
      JOIN repositories r ON pr.repo_id = r.id
      ORDER BY pr.id ASC
    `);
    console.log('Total PRs in database:', res.rows.length);
    console.table(res.rows.map(r => ({
      id: r.id,
      pr_num: r.pr_number,
      repo: `${r.owner}/${r.repo_name}`,
      score: r.risk_score,
      label: r.risk_label,
      title: r.title ? r.title.substring(0, 40) : ''
    })));

    // Also inspect prediction_evaluations
    const peRes = await pool.query(`
      SELECT pe.pr_id, pe.risk_score, pe.ground_truth, pe.evaluation_result
      FROM prediction_evaluations pe
      ORDER BY pe.pr_id ASC
    `);
    console.log('\nEvaluations count:', peRes.rows.length);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
