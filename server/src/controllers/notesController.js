const { pool } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/errors');
const { sanitizeNoteContent, htmlToExcerpt } = require('../utils/sanitize');

// Build "( :k0, :k1, ... )" fragments for IN clauses with named placeholders.
function inPlaceholders(values, prefix) {
  const keys = values.map((_, i) => `${prefix}${i}`);
  const sql = `(${keys.map((k) => `:${k}`).join(', ')})`;
  const params = Object.fromEntries(values.map((v, i) => [`${prefix}${i}`, v]));
  return { sql, params };
}

const VIEW_FILTERS = {
  all: 'n.deleted_at IS NULL AND n.is_archived = 0',
  favorites: 'n.deleted_at IS NULL AND n.is_archived = 0 AND n.is_favorite = 1',
  pinned: 'n.deleted_at IS NULL AND n.is_archived = 0 AND n.is_pinned = 1',
  archive: 'n.deleted_at IS NULL AND n.is_archived = 1',
  trash: 'n.deleted_at IS NOT NULL',
};

const SORTS = {
  newest: 'is_pinned DESC, n.updated_at DESC, n.id DESC',
  oldest: 'is_pinned DESC, n.updated_at ASC, n.id ASC',
  title: 'is_pinned DESC, n.title COLLATE utf8mb4_unicode_ci ASC, n.id DESC',
};

const TAG_ROWS_SQL = `
  SELECT nt.note_id, t.id, t.name
  FROM note_tags nt
  JOIN tags t ON t.id = nt.tag_id
  WHERE nt.note_id IN`;

async function attachTags(rows) {
  if (rows.length === 0) return rows;
  const ids = rows.map((r) => r.id);
  const { sql, params } = inPlaceholders(ids, 'n');
  const [tagRows] = await pool.query(`${TAG_ROWS_SQL} ${sql}`, params);
  const byNote = new Map();
  for (const t of tagRows) {
    if (!byNote.has(t.note_id)) byNote.set(t.note_id, []);
    byNote.get(t.note_id).push({ id: t.id, name: t.name });
  }
  rows.forEach((r) => {
    r.tags = byNote.get(r.id) || [];
    r.excerpt = htmlToExcerpt(r.content);
  });
  return rows;
}

function decorate(note) {
  note.excerpt = htmlToExcerpt(note.content);
  return note;
}

// GET /api/notes?view=all|favorites|pinned|archive|trash&q=&category=&tag=&sort=
const listNotes = asyncHandler(async (req, res) => {
  const view = req.query.view || 'all';
  if (!VIEW_FILTERS[view]) throw new ApiError(400, `Unknown view "${view}".`);

  const where = ['n.user_id = :userId', VIEW_FILTERS[view]];
  const params = { userId: req.user.id };

  if (req.query.q) {
    const q = `%${req.query.q.trim()}%`;
    where.push(
      `(n.title LIKE :q OR n.content LIKE :q OR
        EXISTS (SELECT 1 FROM categories c WHERE c.id = n.category_id AND c.name LIKE :q) OR
        EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
                WHERE nt.note_id = n.id AND t.name LIKE :q))`
    );
    params.q = q;
  }
  if (req.query.category) {
    where.push('n.category_id = :categoryId');
    params.categoryId = Number(req.query.category);
  }
  if (req.query.tag) {
    where.push(
      'EXISTS (SELECT 1 FROM note_tags nt2 WHERE nt2.note_id = n.id AND nt2.tag_id = :tagId)'
    );
    params.tagId = Number(req.query.tag);
  }

  const sort = SORTS[req.query.sort] || SORTS.newest;

  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.content, n.is_pinned, n.is_favorite, n.is_archived,
            n.deleted_at, n.created_at, n.updated_at,
            n.category_id, c.name AS category_name, c.color AS category_color
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY ${sort}`,
    params
  );

  res.json({ notes: await attachTags(rows), total: rows.length });
});

// GET /api/notes/counts  (sidebar badges)
const noteCounts = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
       SUM(deleted_at IS NULL AND is_archived = 0) AS allCount,
       SUM(deleted_at IS NULL AND is_archived = 0 AND is_favorite = 1) AS favorites,
       SUM(deleted_at IS NULL AND is_archived = 0 AND is_pinned = 1) AS pinned,
       SUM(deleted_at IS NULL AND is_archived = 1) AS archived,
       SUM(deleted_at IS NOT NULL) AS trash
     FROM notes WHERE user_id = :userId`,
    { userId: req.user.id }
  );
  const r = rows[0] || {};
  res.json({
    counts: {
      all: Number(r.allCount) || 0,
      favorites: Number(r.favorites) || 0,
      pinned: Number(r.pinned) || 0,
      archived: Number(r.archived) || 0,
      trash: Number(r.trash) || 0,
    },
  });
});

// GET /api/notes/:id
const getNote = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.content, n.is_pinned, n.is_favorite, n.is_archived,
            n.deleted_at, n.created_at, n.updated_at,
            n.category_id, c.name AS category_name, c.color AS category_color
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id
     WHERE n.id = :id AND n.user_id = :userId`,
    { id: Number(req.params.id), userId: req.user.id }
  );
  if (rows.length === 0) throw new ApiError(404, 'Note not found.');

  const [note] = await attachTags(rows);
  res.json({ note });
});

// POST /api/notes
const createNote = asyncHandler(async (req, res) => {
  const { title = '', content = '', categoryId = null, tags = [], isPinned = 0, isFavorite = 0 } = req.body;

  if (categoryId != null) {
    const [cat] = await pool.query(
      'SELECT id FROM categories WHERE id = :id AND user_id = :userId',
      { id: Number(categoryId), userId: req.user.id }
    );
    if (cat.length === 0) throw new ApiError(400, 'Selected category was not found.');
  }

  const [result] = await pool.query(
    `INSERT INTO notes (user_id, category_id, title, content, is_pinned, is_favorite)
     VALUES (:userId, :categoryId, :title, :content, :isPinned, :isFavorite)`,
    {
      userId: req.user.id,
      categoryId: categoryId != null ? Number(categoryId) : null,
      title,
      content: sanitizeNoteContent(content),
      isPinned: isPinned ? 1 : 0,
      isFavorite: isFavorite ? 1 : 0,
    }
  );

  if (Array.isArray(tags) && tags.length > 0) {
    await replaceTags(result.insertId, req.user.id, tags);
  }

  const [rows] = await pool.query('SELECT * FROM notes WHERE id = :id', { id: result.insertId });
  res.status(201).json({ note: decorate(rows[0]) });
});

// Resolve/attach tags: accepts tag ids or names; creates names on the fly.
async function replaceTags(noteId, userId, tags) {
  const ids = [];
  for (const raw of tags.slice(0, 20)) {
    if (typeof raw === 'number' && Number.isInteger(raw)) {
      ids.push(raw);
    } else if (typeof raw === 'string') {
      const name = raw.trim();
      if (!name) continue;
      const [existing] = await pool.query(
        'SELECT id FROM tags WHERE user_id = :userId AND name = :name',
        { userId, name }
      );
      if (existing.length > 0) ids.push(existing[0].id);
      else {
        const [created] = await pool.query(
          'INSERT INTO tags (user_id, name) VALUES (:userId, :name)',
          { userId, name }
        );
        ids.push(created.insertId);
      }
    }
  }
  await pool.query('DELETE FROM note_tags WHERE note_id = :noteId', { noteId });
  const unique = [...new Set(ids)];
  if (unique.length > 0) {
    const { sql, params } = inPlaceholders(unique, 't');
    await pool.query(
      `INSERT INTO note_tags (note_id, tag_id)
       SELECT :noteId, id FROM tags WHERE user_id = :userId AND id IN ${sql}`,
      { noteId, userId, ...params }
    );
  }
}

// PATCH /api/notes/:id   (partial updates: title, content, categoryId, tags, isPinned, isFavorite, isArchived, restore)
const updateNote = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [owned] = await pool.query(
    'SELECT id FROM notes WHERE id = :id AND user_id = :userId',
    { id, userId: req.user.id }
  );
  if (owned.length === 0) throw new ApiError(404, 'Note not found.');

  const body = req.body;
  const sets = [];
  const params = { id, userId: req.user.id };

  if ('title' in body) { sets.push('title = :title'); params.title = body.title; }
  if ('content' in body) { sets.push('content = :content'); params.content = sanitizeNoteContent(body.content); }
  if ('isPinned' in body) { sets.push('is_pinned = :isPinned'); params.isPinned = body.isPinned ? 1 : 0; }
  if ('isFavorite' in body) { sets.push('is_favorite = :isFavorite'); params.isFavorite = body.isFavorite ? 1 : 0; }
  if ('isArchived' in body) { sets.push('is_archived = :isArchived'); params.isArchived = body.isArchived ? 1 : 0; }
  if (body.restore === true) { sets.push('deleted_at = NULL'); }
  if ('categoryId' in body) {
    if (body.categoryId === null) {
      sets.push('category_id = NULL');
    } else {
      const [cat] = await pool.query(
        'SELECT id FROM categories WHERE id = :id AND user_id = :userId',
        { id: Number(body.categoryId), userId: req.user.id }
      );
      if (cat.length === 0) throw new ApiError(400, 'Selected category was not found.');
      sets.push('category_id = :categoryId');
      params.categoryId = Number(body.categoryId);
    }
  }
  if ('trash' in body && body.trash === true) {
    sets.push('deleted_at = CURRENT_TIMESTAMP');
  }

  if (sets.length > 0) {
    await pool.query(`UPDATE notes SET ${sets.join(', ')} WHERE id = :id AND user_id = :userId`, params);
  }

  if ('tags' in body && Array.isArray(body.tags)) {
    await replaceTags(id, req.user.id, body.tags);
  }

  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.content, n.is_pinned, n.is_favorite, n.is_archived,
            n.deleted_at, n.created_at, n.updated_at,
            n.category_id, c.name AS category_name, c.color AS category_color
     FROM notes n LEFT JOIN categories c ON c.id = n.category_id
     WHERE n.id = :id AND n.user_id = :userId`,
    { id, userId: req.user.id }
  );
  if (rows.length === 0) throw new ApiError(404, 'Note not found.');
  const notes = await attachTags(rows);
  res.json({ note: decorate(notes[0]) });
});

// DELETE /api/notes/:id            -> move to trash (soft delete)
// DELETE /api/notes/:id?permanent  -> destroy permanently
const deleteNote = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (req.query.permanent !== undefined) {
    const [result] = await pool.query(
      'DELETE FROM notes WHERE id = :id AND user_id = :userId',
      { id, userId: req.user.id }
    );
    if (result.affectedRows === 0) throw new ApiError(404, 'Note not found.');
    return res.json({ message: 'Note permanently deleted.' });
  }

  const [result] = await pool.query(
    'UPDATE notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id = :userId',
    { id, userId: req.user.id }
  );
  if (result.affectedRows === 0) throw new ApiError(404, 'Note not found.');
  res.json({ message: 'Note moved to trash.' });
});

module.exports = { listNotes, noteCounts, getNote, createNote, updateNote, deleteNote };
