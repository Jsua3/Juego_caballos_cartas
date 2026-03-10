const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/purchases — solicitar compra de 1000 puntos por $10.000 COP
router.post('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO point_purchases (user_id, points_bought, price_cop) VALUES (?, 1000, 10000)`,
      [req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM point_purchases WHERE id = ?', [result.insertId]);
    res.status(201).json({
      message: 'Purchase request received. Points will be added after payment confirmation.',
      purchase: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
