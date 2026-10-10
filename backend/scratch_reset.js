const bcrypt = require('bcryptjs');
const { Client } = require('pg');

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const client = new Client({
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'devrisk_ai',
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT, 10) || 5432
});

async function updatePass() {
  await client.connect();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'mayurb@gmail.com']);
  console.log('Password reset to password123');
  await client.end();
}

updatePass().catch(console.error);
