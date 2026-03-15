const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ── GET /unread/count — conteo de mensajes no leídos por remitente ────────────
router.get('/unread/count', async (req, res) => {
  const me = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT dm.sender_id AS senderId, u.username, u.display_name, u.avatar_url,
              COUNT(*) AS unreadCount
       FROM direct_messages dm
       JOIN users u ON u.id = dm.sender_id
       WHERE dm.receiver_id = ? AND dm.is_read = FALSE
       GROUP BY dm.sender_id, u.username, u.display_name, u.avatar_url`,
      [me]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener conteo de mensajes' });
  }
});

// ── GET /:userId — historial de mensajes con un usuario ───────────────────────
router.get('/:userId', async (req, res) => {
  const me = req.user.id;
  const otherId = parseInt(req.params.userId, 10);

  if (isNaN(otherId)) return res.status(400).json({ error: 'ID inválido' });

  try {
    // Validate friendship
    const [friendRows] = await pool.query(
      `SELECT id FROM friendships WHERE status = 'accepted'
       AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))`,
      [me, otherId, otherId, me]
    );
    if (friendRows.length === 0) {
      return res.status(403).json({ error: 'No son amigos' });
    }

    const [messages] = await pool.query(
      `SELECT id, sender_id AS senderId, receiver_id AS receiverId,
              message, is_read AS isRead, created_at AS timestamp
       FROM direct_messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC
       LIMIT 50`,
      [me, otherId, otherId, me]
    );

    // Mark received messages as read
    await pool.query(
      `UPDATE direct_messages SET is_read = TRUE
       WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
      [otherId, me]
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

module.exports = router;
