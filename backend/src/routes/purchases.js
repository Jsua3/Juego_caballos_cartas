const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ── Generar código de canje (solo admin) ──────────────────────────────────────
// POST /api/purchases/generate-code
// Header: x-admin-secret: <ADMIN_SECRET>
router.post('/generate-code', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const points = parseInt(req.body.points) || 1000;
  const code = generateCode();

  try {
    await pool.query(
      'INSERT INTO redemption_codes (code, points) VALUES (?, ?)',
      [code, points]
    );
    res.status(201).json({ code, points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Canjear código ────────────────────────────────────────────────────────────
// POST /api/purchases/redeem  { code }
router.post('/redeem', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  try {
    const [rows] = await pool.query(
      'SELECT * FROM redemption_codes WHERE code = ?',
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Código inválido' });
    }
    const record = rows[0];
    if (record.used_by !== null) {
      return res.status(409).json({ error: 'Este código ya fue utilizado' });
    }

    // Acreditar puntos y marcar código como usado
    await pool.query(
      'UPDATE redemption_codes SET used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id, record.id]
    );
    await pool.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [record.points, req.user.id]
    );
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, description)
       VALUES (?, 'purchase', ?, ?)`,
      [req.user.id, record.points, `Canje de código: ${record.code}`]
    );

    const [updated] = await pool.query('SELECT points FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Código canjeado exitosamente', pointsAdded: record.points, totalPoints: updated[0].points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Solicitud de compra manual (registro) ─────────────────────────────────────
// POST /api/purchases
router.post('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO point_purchases (user_id, points_bought, price_cop) VALUES (?, 1000, 10000)`,
      [req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM point_purchases WHERE id = ?', [result.insertId]);
    res.status(201).json({
      message: 'Solicitud registrada. Recibirás un código de canje una vez confirmado el pago.',
      purchase: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // formato: XXXXX-XXXXX
}

module.exports = router;
