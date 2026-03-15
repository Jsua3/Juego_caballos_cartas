const express = require('express');
const path    = require('path');
const fs      = require('fs');
const pool    = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const upload  = require('../middleware/upload');

const router = express.Router();

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, display_name, avatar_url, bio, email, points, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [stats] = await pool.query(
      `SELECT
         COUNT(DISTINCT rp.room_id)                                          AS games_played,
         COALESCE(SUM(CASE WHEN t.type='win' THEN 1 ELSE 0 END), 0)         AS games_won,
         COALESCE(SUM(CASE WHEN t.type='win'  THEN t.amount ELSE 0 END), 0) AS points_won,
         COALESCE(SUM(CASE WHEN t.type='bet'  THEN ABS(t.amount) ELSE 0 END), 0) AS points_bet
       FROM room_players rp
       LEFT JOIN transactions t ON t.user_id = rp.user_id
       WHERE rp.user_id = ?`,
      [req.user.id]
    );

    const [userRow] = await pool.query('SELECT points FROM users WHERE id = ?', [req.user.id]);

    const row = stats[0];
    const games_played = Number(row.games_played);
    const games_won    = Number(row.games_won);

    res.json({
      games_played,
      games_won,
      win_rate:       games_played > 0 ? Math.round((games_won / games_played) * 100) : 0,
      points_won:     Number(row.points_won),
      points_bet:     Number(row.points_bet),
      current_points: userRow[0]?.points ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/search?q=xxx  (debe ir ANTES de /:id)
router.get('/search', authMiddleware, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT id, username, display_name, avatar_url
       FROM users
       WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
       LIMIT 10`,
      [like, like, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/me — Editar perfil
router.put('/me', authMiddleware, async (req, res) => {
  const { display_name, bio } = req.body;

  if (display_name !== undefined && display_name.length > 50)
    return res.status(400).json({ error: 'display_name máximo 50 caracteres' });
  if (bio !== undefined && bio.length > 200)
    return res.status(400).json({ error: 'bio máximo 200 caracteres' });

  const fields = [];
  const values = [];
  if (display_name !== undefined) { fields.push('display_name = ?'); values.push(display_name || null); }
  if (bio          !== undefined) { fields.push('bio = ?');          values.push(bio || null); }
  if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

  values.push(req.user.id);
  try {
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query(
      'SELECT id, username, display_name, avatar_url, bio, email, points, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/me/avatar — Subir avatar
router.post(
  '/me/avatar',
  authMiddleware,
  (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    try {
      const [rows] = await pool.query('SELECT avatar_url FROM users WHERE id = ?', [req.user.id]);
      const oldUrl = rows[0]?.avatar_url;

      await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

      // Borrar archivo anterior si existe
      if (oldUrl) {
        const oldPath = path.join(__dirname, '../../uploads/avatars', path.basename(oldUrl));
        fs.unlink(oldPath, (err) => { if (err) console.warn('No se pudo borrar avatar anterior:', err.message); });
      }

      res.json({ avatar_url: avatarUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/users/:id/profile — Perfil público
router.get('/:id/profile', authMiddleware, async (req, res) => {
  const profileId = parseInt(req.params.id, 10);
  if (isNaN(profileId)) return res.status(400).json({ error: 'ID inválido' });

  try {
    const [users] = await pool.query(
      'SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE id = ?',
      [profileId]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const [stats] = await pool.query(
      `SELECT
         COUNT(DISTINCT rp.room_id) AS games_played,
         COALESCE(SUM(CASE WHEN t.type='win' THEN 1 ELSE 0 END), 0) AS games_won,
         COALESCE(SUM(CASE WHEN t.type='win' THEN t.amount ELSE 0 END), 0) AS points_won
       FROM room_players rp
       LEFT JOIN transactions t ON t.user_id = rp.user_id
       WHERE rp.user_id = ?`,
      [profileId]
    );

    const s = stats[0];
    const games_played = Number(s.games_played);
    const games_won    = Number(s.games_won);

    res.json({
      ...users[0],
      games_played,
      games_won,
      win_rate:   games_played > 0 ? Math.round((games_won / games_played) * 100) : 0,
      points_won: Number(s.points_won),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
