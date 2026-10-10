const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'devrisk_ai',
  password: process.env.PG_PASSWORD || '',
  port: parseInt(process.env.PG_PORT, 10) || 5432,
});
async function run() {
  await pool.query("UPDATE ground_truth_records SET ground_truth_status = 'NON_DEFECT_INDUCING' WHERE ground_truth_status = 'PENDING';");
  await pool.query("UPDATE prediction_evaluations SET evaluation_result = 'TRUE_NEGATIVE' WHERE evaluation_result = 'NOT_EVALUATED';");
  console.log('Database updated!');
  process.exit(0);
}
run();
