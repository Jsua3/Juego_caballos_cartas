const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, points, created_at FROM users WHERE id = ?',
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

module.exports = router;
