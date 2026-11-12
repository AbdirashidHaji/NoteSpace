/**
 * Applies database/schema.sql to the configured MySQL server.
 * Safe to re-run: the schema only uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage: npm run setup   (from the server folder)
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function main() {
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Connect WITHOUT selecting the database, since schema.sql creates it.
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log(`Schema applied to MySQL at ${env.db.host}:${env.db.port} (database: ${env.db.database}).`);
    console.log('Existing tables and data were not modified.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Failed to apply schema:', err.code || '', err.message);
  console.error('Check DB_USER / DB_PASSWORD in server/.env and confirm MySQL is running.');
  process.exit(1);
});
