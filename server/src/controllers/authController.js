const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/errors');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = :email', { email });
  if (existing.length > 0) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :passwordHash)',
    { name, email, passwordHash }
  );

  const [rows] = await pool.query('SELECT * FROM users WHERE id = :id', { id: result.insertId });
  const user = rows[0];
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
  const user = rows[0];

  // Generic message - do not reveal whether the email exists.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// PATCH /api/auth/profile  { name }
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  await pool.query('UPDATE users SET name = :name WHERE id = :id', { name, id: req.user.id });

  const [rows] = await pool.query('SELECT * FROM users WHERE id = :id', { id: req.user.id });
  res.json({ user: publicUser(rows[0]) });
});

// PATCH /api/auth/password  { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = :id', { id: req.user.id });
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) {
    throw new ApiError(400, 'Your current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = :passwordHash WHERE id = :id', {
    passwordHash,
    id: req.user.id,
  });

  res.json({ message: 'Password updated successfully.' });
});

module.exports = { register, login, me, updateProfile, changePassword };
