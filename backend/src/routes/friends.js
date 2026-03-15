const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Factory function — receives io and shared state so routes can emit socket events.
 */
module.exports = function createFriendsRouter(io, { onlineUsers, userSockets }) {
  const router = express.Router();
  router.use(authMiddleware);

  // ── GET / — lista de amigos aceptados ──────────────────────────────────────
  router.get('/', async (req, res) => {
    const me = req.user.id;
    try {
      const [rows] = await pool.query(
        `SELECT f.id AS friendshipId,
                CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END AS friendId,
                u.username, u.display_name, u.avatar_url
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
         WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'`,
        [me, me, me, me]
      );
      const onlineIds = new Set(Array.from(onlineUsers.values()).map((u) => u.userId));
      const friends = rows.map((r) => ({
        friendshipId: r.friendshipId,
        id:           r.friendId,
        username:     r.username,
        display_name: r.display_name,
        avatar_url:   r.avatar_url,
        isOnline:     onlineIds.has(r.friendId),
      }));
      res.json(friends);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener amigos' });
    }
  });

  // ── GET /requests — solicitudes recibidas pendientes ───────────────────────
  router.get('/requests', async (req, res) => {
    const me = req.user.id;
    try {
      const [rows] = await pool.query(
        `SELECT f.id AS friendshipId, u.id, u.username, u.display_name, u.avatar_url, f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.user_id
         WHERE f.friend_id = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [me]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
  });

  // ── GET /sent — solicitudes enviadas pendientes ────────────────────────────
  router.get('/sent', async (req, res) => {
    const me = req.user.id;
    try {
      const [rows] = await pool.query(
        `SELECT f.id AS friendshipId, u.id, u.username, u.display_name, u.avatar_url, f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [me]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener solicitudes enviadas' });
    }
  });

  // ── GET /status/:userId — estado de amistad con un usuario ─────────────────
  router.get('/status/:userId', async (req, res) => {
    const me = req.user.id;
    const otherId = parseInt(req.params.userId, 10);
    if (isNaN(otherId)) return res.status(400).json({ error: 'ID inválido' });
    if (otherId === me) return res.json({ status: 'self', friendshipId: null });

    try {
      const [rows] = await pool.query(
        `SELECT id, status, user_id FROM friendships
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        [me, otherId, otherId, me]
      );
      if (rows.length === 0) return res.json({ status: 'none', friendshipId: null });

      const f = rows[0];
      let status = f.status;
      if (f.status === 'pending') {
        status = f.user_id === me ? 'sent' : 'received';
      }
      res.json({ status, friendshipId: f.id });
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener estado' });
    }
  });

  // ── POST /request — enviar solicitud de amistad ────────────────────────────
  router.post('/request', async (req, res) => {
    const me = req.user.id;
    const { userId } = req.body;

    if (!userId || parseInt(userId) === me) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    const targetId = parseInt(userId, 10);

    try {
      // Check if relationship already exists (either direction)
      const [existing] = await pool.query(
        `SELECT id, status FROM friendships
         WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        [me, targetId, targetId, me]
      );
      if (existing.length > 0) {
        const s = existing[0].status;
        if (s === 'accepted') return res.status(400).json({ error: 'Ya son amigos' });
        if (s === 'pending')  return res.status(400).json({ error: 'Ya existe una solicitud pendiente' });
      }

      const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [targetId]);
      if (users.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      const [result] = await pool.query(
        `INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
        [me, targetId]
      );

      // Notify receiver if online
      const receiverSocketId = userSockets.get(targetId);
      if (receiverSocketId) {
        const [senderRows] = await pool.query(
          'SELECT username, display_name, avatar_url FROM users WHERE id = ?', [me]
        );
        if (senderRows.length > 0) {
          io.to(receiverSocketId).emit('friend_request_received', {
            friendshipId: result.insertId,
            id:           me,
            username:     senderRows[0].username,
            display_name: senderRows[0].display_name,
            avatar_url:   senderRows[0].avatar_url,
          });
        }
      }

      res.json({ friendshipId: result.insertId, message: 'Solicitud enviada' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al enviar solicitud' });
    }
  });

  // ── PUT /:friendshipId/accept — aceptar solicitud ─────────────────────────
  router.put('/:friendshipId/accept', async (req, res) => {
    const me = req.user.id;
    const friendshipId = parseInt(req.params.friendshipId, 10);

    try {
      const [rows] = await pool.query(
        `SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = 'pending'`,
        [friendshipId, me]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

      await pool.query(`UPDATE friendships SET status = 'accepted' WHERE id = ?`, [friendshipId]);

      // Notify sender if online
      const senderSocketId = userSockets.get(rows[0].user_id);
      if (senderSocketId) {
        const [meRows] = await pool.query(
          'SELECT username, display_name, avatar_url FROM users WHERE id = ?', [me]
        );
        if (meRows.length > 0) {
          io.to(senderSocketId).emit('friend_request_accepted', {
            friendshipId,
            id:           me,
            username:     meRows[0].username,
            display_name: meRows[0].display_name,
            avatar_url:   meRows[0].avatar_url,
          });
        }
      }

      res.json({ message: 'Solicitud aceptada' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al aceptar solicitud' });
    }
  });

  // ── PUT /:friendshipId/reject — rechazar solicitud ────────────────────────
  router.put('/:friendshipId/reject', async (req, res) => {
    const me = req.user.id;
    const friendshipId = parseInt(req.params.friendshipId, 10);

    try {
      const [rows] = await pool.query(
        `SELECT id FROM friendships WHERE id = ? AND friend_id = ? AND status = 'pending'`,
        [friendshipId, me]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

      await pool.query('DELETE FROM friendships WHERE id = ?', [friendshipId]);
      res.json({ message: 'Solicitud rechazada' });
    } catch (err) {
      res.status(500).json({ error: 'Error al rechazar solicitud' });
    }
  });

  // ── DELETE /:friendshipId — eliminar amistad ──────────────────────────────
  router.delete('/:friendshipId', async (req, res) => {
    const me = req.user.id;
    const friendshipId = parseInt(req.params.friendshipId, 10);

    try {
      const [rows] = await pool.query(
        `SELECT id FROM friendships WHERE id = ? AND (user_id = ? OR friend_id = ?)`,
        [friendshipId, me, me]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Amistad no encontrada' });

      await pool.query('DELETE FROM friendships WHERE id = ?', [friendshipId]);
      res.json({ message: 'Amistad eliminada' });
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar amistad' });
    }
  });

  return router;
};
