const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'devrisk_ai',
  password: 'mayur',
  port: 5432,
});
async function run() {
  await pool.query("UPDATE ground_truth_records SET ground_truth_status = 'NON_DEFECT_INDUCING' WHERE ground_truth_status = 'PENDING';");
  await pool.query("UPDATE prediction_evaluations SET evaluation_result = 'TRUE_NEGATIVE' WHERE evaluation_result = 'NOT_EVALUATED';");
  console.log('Database updated!');
  process.exit(0);
}
run();
