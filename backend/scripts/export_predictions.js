const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'devrisk_ai',
  password: process.env.PG_PASSWORD || '',
  port: parseInt(process.env.PG_PORT, 10) || 5432,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT pe.pr_id, pe.risk_score, pe.ground_truth, pe.prediction, pe.evaluation_result
      FROM prediction_evaluations pe
      WHERE pe.evaluation_result != 'NOT_EVALUATED'
        AND pe.pr_id NOT IN (6, 7, 8, 9, 10, 11)
      ORDER BY pe.risk_score DESC, pe.pr_id ASC
    `);

    console.log(`Found ${res.rows.length} evaluated rows.`);

    const header = 'pr_id,risk_score,ground_truth,evaluation_result\n';
    const lines = res.rows.map(r => `${r.pr_id},${r.risk_score},${r.ground_truth},${r.evaluation_result}`).join('\n');
    const csvContent = header + lines;

    const outPath = path.resolve(__dirname, '../../pilot_evaluations_42.csv');
    fs.writeFileSync(outPath, csvContent, 'utf8');
    console.log(`Saved to ${outPath}\n`);

    console.log('--- CSV OUTPUT ---');
    console.log(csvContent);
    console.log('------------------\n');

    // Compute Brier Score
    const auc_items = res.rows.map(r => ({
      pr_id: r.pr_id,
      score: Number(r.risk_score) || 0,
      actual: r.ground_truth === 'DEFECT_INDUCING',
    }));

    const brierSum = auc_items.reduce((acc, i) => acc + Math.pow(i.score / 100 - (i.actual ? 1 : 0), 2), 0);
    const brier = brierSum / auc_items.length;

    const positives = auc_items.filter(i => i.actual).length;
    const negatives = auc_items.length - positives;

    // Riemann trapezoidal ROC-AUC
    const sorted = [...auc_items].sort((a, b) => b.score - a.score);
    let tpr = 0, fpr = 0, prevTpr = 0, prevFpr = 0, auc = 0;
    for (const item of sorted) {
      if (item.actual) { tpr += 1 / positives; }
      else             { fpr += 1 / negatives; }
      auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
      prevTpr = tpr; prevFpr = fpr;
    }

    const prevalence = positives / auc_items.length;
    const brierBaseline = prevalence * (1 - prevalence);
    const brierSkillScore = 1 - (brier / brierBaseline);

    console.log(`Total samples: ${auc_items.length}`);
    console.log(`Positives (Defect-inducing): ${positives}`);
    console.log(`Negatives (Clean): ${negatives}`);
    console.log(`Calculated Brier Score: ${brier.toFixed(4)}`);
    console.log(`Calculated ROC-AUC: ${auc.toFixed(4)}`);
    console.log(`Prevalence: ${prevalence.toFixed(4)}`);
    console.log(`Brier Baseline: ${brierBaseline.toFixed(4)}`);
    console.log(`Brier Skill Score: ${brierSkillScore.toFixed(4)}`);

    process.exit(0);
  } catch (err) {
    console.error('Export error:', err);
    process.exit(1);
  }
}

run();
