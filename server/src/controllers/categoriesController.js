const { pool } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// GET /api/categories?q=
const listCategories = asyncHandler(async (req, res) => {
  const params = { userId: req.user.id };
  let where = 'c.user_id = :userId';
  if (req.query.q) {
    where += ' AND c.name LIKE :q';
    params.q = `%${req.query.q.trim()}%`;
  }

  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.color, c.created_at,
            (SELECT COUNT(*) FROM notes n
              WHERE n.category_id = c.id AND n.deleted_at IS NULL) AS note_count
     FROM categories c
     WHERE ${where}
     ORDER BY c.name COLLATE utf8mb4_unicode_ci ASC`,
    params
  );
  res.json({ categories: rows, total: rows.length });
});

// POST /api/categories { name, color? }
const createCategory = asyncHandler(async (req, res) => {
  const name = req.body.name.trim();
  const color = HEX_COLOR.test(req.body.color || '') ? req.body.color : '#6366f1';

  const [dup] = await pool.query(
    'SELECT id FROM categories WHERE user_id = :userId AND name = :name',
    { userId: req.user.id, name }
  );
  if (dup.length > 0) throw new ApiError(409, 'You already have a category with this name.');

  const [result] = await pool.query(
    'INSERT INTO categories (user_id, name, color) VALUES (:userId, :name, :color)',
    { userId: req.user.id, name, color }
  );
  const [rows] = await pool.query('SELECT * FROM categories WHERE id = :id', { id: result.insertId });
  res.status(201).json({ category: rows[0] });
});

// PATCH /api/categories/:id { name?, color? }
const updateCategory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [owned] = await pool.query(
    'SELECT id FROM categories WHERE id = :id AND user_id = :userId',
    { id, userId: req.user.id }
  );
  if (owned.length === 0) throw new ApiError(404, 'Category not found.');

  const name = req.body.name !== undefined ? req.body.name.trim() : undefined;
  const color = req.body.color !== undefined && HEX_COLOR.test(req.body.color) ? req.body.color : undefined;

  if (name !== undefined) {
    const [dup] = await pool.query(
      'SELECT id FROM categories WHERE user_id = :userId AND name = :name AND id <> :id',
      { userId: req.user.id, name, id }
    );
    if (dup.length > 0) throw new ApiError(409, 'You already have a category with this name.');
  }

  const sets = [];
  const params = { id, userId: req.user.id };
  if (name !== undefined) { sets.push('name = :name'); params.name = name; }
  if (color !== undefined) { sets.push('color = :color'); params.color = color; }
  if (sets.length > 0) {
    await pool.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = :id AND user_id = :userId`, params);
  }

  const [rows] = await pool.query('SELECT * FROM categories WHERE id = :id', { id });
  res.json({ category: rows[0] });
});

// DELETE /api/categories/:id   (notes keep existing; category_id becomes NULL)
const deleteCategory = asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM categories WHERE id = :id AND user_id = :userId',
    { id: Number(req.params.id), userId: req.user.id }
  );
  if (result.affectedRows === 0) throw new ApiError(404, 'Category not found.');
  res.json({ message: 'Category deleted. Notes in it are now uncategorized.' });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
