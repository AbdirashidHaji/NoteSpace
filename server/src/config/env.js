const path = require('path');
// .env lives in the server/ folder (two levels above src/config).
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    // Don't crash at import time for DB creds - let health checks report it.
    if (name === 'JWT_SECRET') {
      throw new Error('JWT_SECRET is missing. Set it in server/.env');
    }
    return undefined;
  }
  return value;
}

const env = {
  port: parseInt(process.env.PORT, 10) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'notespace',
  },
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  isDev: process.env.NODE_ENV !== 'production',
};

module.exports = env;
