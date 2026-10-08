const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'mayur',
  database: 'devrisk_ai',
  host: 'localhost',
  port: 5432
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
