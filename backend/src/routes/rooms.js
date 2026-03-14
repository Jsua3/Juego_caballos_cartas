const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/rooms — salas en estado 'waiting' con <4 jugadores
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT gr.id, gr.room_code, gr.status, gr.max_players, gr.game_mode, gr.created_at,
             COUNT(rp.id) AS player_count
      FROM game_rooms gr
      LEFT JOIN room_players rp ON rp.room_id = gr.id
      WHERE gr.status = 'waiting'
        AND gr.created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
      GROUP BY gr.id
      HAVING COUNT(rp.id) < gr.max_players
      ORDER BY gr.created_at DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms — crear nueva sala
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { gameMode = 'caballos' } = req.body;
    if (!['caballos', 'blackjack'].includes(gameMode)) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }
    let roomCode;
    let attempts = 0;
    while (attempts < 10) {
      roomCode = generateRoomCode();
      const [existing] = await pool.query('SELECT id FROM game_rooms WHERE room_code = ?', [roomCode]);
      if (existing.length === 0) break;
      attempts++;
    }
    const [result] = await pool.query(
      `INSERT INTO game_rooms (room_code, game_mode) VALUES (?, ?)`,
      [roomCode, gameMode]
    );
    const [rows] = await pool.query('SELECT * FROM game_rooms WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
