/**
 * 收藏路由
 */
const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const list = db.prepare(`
    SELECT f.id, f.created_at, c.*
    FROM favorites f
    JOIN concerts c ON f.concert_id = c.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json({ code: 0, data: list });
});

router.post('/', authRequired, (req, res) => {
  const { concert_id } = req.body;
  if (!concert_id) {
    return res.status(400).json({ code: 400, message: '缺少演唱会ID', data: null });
  }
  try {
    db.prepare('INSERT INTO favorites (user_id, concert_id) VALUES (?, ?)').run(req.user.id, concert_id);
    res.json({ code: 0, message: '收藏成功' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.json({ code: 0, message: '已收藏过' });
    } else {
      res.status(500).json({ code: 500, message: '收藏失败', data: null });
    }
  }
});

router.delete('/:concertId', authRequired, (req, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND concert_id = ?').run(req.user.id, req.params.concertId);
  res.json({ code: 0, message: '取消收藏' });
});

module.exports = router;
