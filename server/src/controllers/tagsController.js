const { pool } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');

// GET /api/tags?q=
const listTags = asyncHandler(async (req, res) => {
  const params = { userId: req.user.id };
  let where = 't.user_id = :userId';
  if (req.query.q) {
    where += ' AND t.name LIKE :q';
    params.q = `%${req.query.q.trim()}%`;
  }

  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.created_at,
            (SELECT COUNT(*) FROM note_tags nt JOIN notes n ON n.id = nt.note_id
              WHERE nt.tag_id = t.id AND n.deleted_at IS NULL) AS note_count
     FROM tags t
     WHERE ${where}
     ORDER BY t.name COLLATE utf8mb4_unicode_ci ASC`,
    params
  );
  res.json({ tags: rows, total: rows.length });
});

// POST /api/tags { name }
const createTag = asyncHandler(async (req, res) => {
  const name = req.body.name.trim();

  const [dup] = await pool.query(
    'SELECT id FROM tags WHERE user_id = :userId AND name = :name',
    { userId: req.user.id, name }
  );
  if (dup.length > 0) throw new ApiError(409, 'You already have a tag with this name.');

  const [result] = await pool.query(
    'INSERT INTO tags (user_id, name) VALUES (:userId, :name)',
    { userId: req.user.id, name }
  );
  const [rows] = await pool.query('SELECT * FROM tags WHERE id = :id', { id: result.insertId });
  res.status(201).json({ tag: rows[0] });
});

// PATCH /api/tags/:id { name }
const updateTag = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [owned] = await pool.query(
    'SELECT id FROM tags WHERE id = :id AND user_id = :userId',
    { id, userId: req.user.id }
  );
  if (owned.length === 0) throw new ApiError(404, 'Tag not found.');

  const name = req.body.name.trim();
  const [dup] = await pool.query(
    'SELECT id FROM tags WHERE user_id = :userId AND name = :name AND id <> :id',
    { userId: req.user.id, name, id }
  );
  if (dup.length > 0) throw new ApiError(409, 'You already have a tag with this name.');

  await pool.query('UPDATE tags SET name = :name WHERE id = :id AND user_id = :userId', {
    name,
    id,
    userId: req.user.id,
  });
  const [rows] = await pool.query('SELECT * FROM tags WHERE id = :id', { id });
  res.json({ tag: rows[0] });
});

// DELETE /api/tags/:id   (associations cascade via note_tags FK)
const deleteTag = asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    'DELETE FROM tags WHERE id = :id AND user_id = :userId',
    { id: Number(req.params.id), userId: req.user.id }
  );
  if (result.affectedRows === 0) throw new ApiError(404, 'Tag not found.');
  res.json({ message: 'Tag deleted and removed from all notes.' });
});

module.exports = { listTags, createTag, updateTag, deleteTag };
