/**
 * 留言路由：发帖/回复/点赞/列表
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

router.get('/', authOptional, (req, res) => {
  const { page = 1, limit = 20, concert_id, artist, tag, top } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit) || 20);
  const offset = (pageNum - 1) * limitNum;

  // 构建查询条件
  let whereClause = 'WHERE m.parent_id IS NULL';
  const params = [];

  if (concert_id) {
    whereClause += ' AND m.concert_id = ?';
    params.push(concert_id);
  } else if (artist) {
    whereClause += ' AND m.artist = ?';
    params.push(artist);
  }

  if (tag && tag !== 'all') {
    whereClause += ' AND m.tag = ?';
    params.push(tag);
  }

  // 排序：top=1 按点赞数排序（热门），否则按时间排序
  const orderBy = top === '1' ? 'ORDER BY m.likes_count DESC, m.created_at DESC' : 'ORDER BY m.created_at DESC';

  const messages = db.prepare(`
    SELECT m.*, u.nickname, u.avatar_url
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ${whereClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  for (const msg of messages) {
    msg.replies = db.prepare(`
      SELECT m.*, u.nickname, u.avatar_url
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.parent_id = ?
      ORDER BY m.created_at ASC
    `).all(msg.id);

    if (req.user) {
      msg.liked = !!db.prepare('SELECT id FROM message_likes WHERE message_id = ? AND user_id = ?').get(msg.id, req.user.id);
      for (const reply of msg.replies) {
        reply.liked = !!db.prepare('SELECT id FROM message_likes WHERE message_id = ? AND user_id = ?').get(reply.id, req.user.id);
      }
    } else {
      msg.liked = false;
      for (const reply of msg.replies) {
        reply.liked = false;
      }
    }
  }

  // 统计总数
  const totalQuery = db.prepare(`SELECT COUNT(*) as c FROM messages m ${whereClause}`);
  const total = totalQuery.get(...params).c;
  res.json({ code: 0, data: { list: messages, total, page: pageNum, limit: limitNum } });
});

router.post('/', authRequired,
  [body('content').notEmpty().withMessage('留言内容不能为空')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, message: errors.array()[0].msg, data: null });
    }

    const { content, sticker, parent_id, concert_id, artist, tag } = req.body;
    const result = db.prepare(`
      INSERT INTO messages (user_id, parent_id, concert_id, artist, tag, content, sticker)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, parent_id || null, concert_id || null, artist || '', tag || '', content, sticker || '');

    const msg = db.prepare(`
      SELECT m.*, u.nickname, u.avatar_url
      FROM messages m JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);
    msg.liked = false;
    msg.replies = [];

    res.json({ code: 0, data: msg });
  }
);

router.delete('/:id', authRequired, (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) {
    return res.status(404).json({ code: 404, message: '留言不存在', data: null });
  }
  if (msg.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '无权删除', data: null });
  }
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

router.post('/:id/like', authRequired, (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) {
    return res.status(404).json({ code: 404, message: '留言不存在', data: null });
  }
  const existing = db.prepare('SELECT id FROM message_likes WHERE message_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) {
    return res.json({ code: 0, message: '已点赞过', data: { likes_count: msg.likes_count } });
  }
  db.prepare('INSERT INTO message_likes (message_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  db.prepare('UPDATE messages SET likes_count = likes_count + 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT likes_count FROM messages WHERE id = ?').get(req.params.id);
  res.json({ code: 0, data: { likes_count: updated.likes_count, liked: true } });
});

router.delete('/:id/like', authRequired, (req, res) => {
  const result = db.prepare('DELETE FROM message_likes WHERE message_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes > 0) {
    db.prepare('UPDATE messages SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(req.params.id);
  }
  const updated = db.prepare('SELECT likes_count FROM messages WHERE id = ?').get(req.params.id);
  res.json({ code: 0, data: { likes_count: updated ? updated.likes_count : 0, liked: false } });
});

module.exports = router;
