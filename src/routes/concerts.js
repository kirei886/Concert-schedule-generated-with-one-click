/**
 * 演唱会路由：CRUD + 热门列表
 */
const express = require('express');
const db = require('../db');
const { authRequired, adminRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { city, artist, status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit) || 20);
  const offset = (pageNum - 1) * limitNum;

  let sql = 'SELECT * FROM concerts WHERE 1=1';
  const params = [];
  if (city) { sql += ' AND city = ?'; params.push(city); }
  if (artist) { sql += ' AND artist LIKE ?'; params.push('%' + artist + '%'); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY concert_date ASC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const concerts = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM concerts WHERE 1=1' +
    (city ? ' AND city = ?' : '') +
    (artist ? ' AND artist LIKE ?' : '') +
    (status ? ' AND status = ?' : '')
  ).get(...params.slice(0, -2)).c;

  res.json({ code: 0, data: { list: concerts, total, page: pageNum, limit: limitNum } });
});

router.get('/hot', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let concerts = db.prepare(`
    SELECT * FROM concerts WHERE concert_date >= ? AND status != 'finished' ORDER BY concert_date ASC
  `).all(today);

  for (let i = concerts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [concerts[i], concerts[j]] = [concerts[j], concerts[i]];
  }
  concerts = concerts.slice(0, 15);
  res.json({ code: 0, data: concerts });
});

router.get('/:id', (req, res) => {
  const concert = db.prepare('SELECT * FROM concerts WHERE id = ?').get(req.params.id);
  if (!concert) {
    return res.status(404).json({ code: 404, message: '演唱会不存在', data: null });
  }

  if (req.user) {
    const fav = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND concert_id = ?').get(req.user.id, concert.id);
    concert.is_favorited = !!fav;
  }

  res.json({ code: 0, data: concert });
});

router.post('/', authRequired, adminRequired, (req, res) => {
  const { artist, tour_name, city, venue, concert_date, start_time, status, tag } = req.body;
  if (!artist || !city || !concert_date) {
    return res.status(400).json({ code: 400, message: '艺人、城市、日期为必填', data: null });
  }
  const result = db.prepare(`
    INSERT INTO concerts (artist, tour_name, city, venue, concert_date, start_time, status, tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(artist, tour_name || '', city, venue || '', concert_date, start_time || '19:00', status || 'upcoming', tag || '');
  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

router.put('/:id', authRequired, adminRequired, (req, res) => {
  const { artist, tour_name, city, venue, concert_date, start_time, status, tag } = req.body;
  db.prepare(`
    UPDATE concerts SET
      artist = COALESCE(?, artist),
      tour_name = COALESCE(?, tour_name),
      city = COALESCE(?, city),
      venue = COALESCE(?, venue),
      concert_date = COALESCE(?, concert_date),
      start_time = COALESCE(?, start_time),
      status = COALESCE(?, status),
      tag = COALESCE(?, tag)
    WHERE id = ?
  `).run(artist, tour_name, city, venue, concert_date, start_time, status, tag, req.params.id);
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  db.prepare('DELETE FROM concerts WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
