const mysql = require('mysql2/promise');
const env = require('./env');

// Connection pool - reused across requests, survives reconnects.
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATETIME as strings, avoid TZ surprises
  namedPlaceholders: true,
});

// Simple health probe used by /api/health
async function ping() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows && rows.length > 0;
}

module.exports = { pool, ping };
