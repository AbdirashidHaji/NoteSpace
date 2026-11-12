const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');

/** Verify the Bearer JWT and attach the current user (from DB) to req.user. */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    throw new ApiError(401, 'Authentication required.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch (err) {
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = :id',
    { id: payload.sub }
  );
  const user = rows[0];
  if (!user) {
    throw new ApiError(401, 'Account not found. Please sign in again.');
  }

  req.user = user;
  next();
});

/** Optional variant: continues unauthenticated when no token is provided. */
const authenticateOptional = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  authenticate(req, res, next).catch(next);
};

module.exports = { authenticate, authenticateOptional };
