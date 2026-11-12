const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/errors');
const env = require('../config/env');

/** Runs express-validator chains; throws a 422 with field errors on failure. */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    throw new ApiError(422, errors[0]?.message || 'Validation failed.', errors);
  }
  next();
};

/** 404 for unmatched API routes. */
const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
};

/** Centralized error handler - never leaks stack traces or internals. */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  if (status >= 500) {
    // Log server-side for diagnosis, respond with a generic message.
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err.code || '', err.message);
    if (err.sqlMessage) console.error('[sql]', err.sqlMessage);
  }

  let message = err.message || 'Something went wrong.';
  if (status >= 500) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') message = 'Database access denied. Check DB_USER/DB_PASSWORD in server/.env';
    else if (err.code === 'ER_BAD_DB_ERROR') message = `Database "${env.db.database}" was not found. Run: npm run db:schema`;
    else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') message = 'Cannot reach MySQL. Confirm the MySQL80 service is running.';
    else message = 'Internal server error.';
  }

  res.status(status).json({
    message,
    ...(err.details ? { errors: err.details } : {}),
  });
};

module.exports = { validate, notFoundHandler, errorHandler };
