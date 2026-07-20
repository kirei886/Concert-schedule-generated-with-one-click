/**
 * 行程路由：CRUD + 分享
 */
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');

const router = express.Router();

function genShareCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

router.get('/', authRequired, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit) || 20);
  const offset = (pageNum - 1) * limitNum;

  const list = db.prepare(`
    SELECT i.*, c.artist, c.tour_name, c.city, c.venue, c.concert_date
    FROM itineraries i
    LEFT JOIN concerts c ON i.concert_id = c.id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limitNum, offset);

  const total = db.prepare('SELECT COUNT(*) as c FROM itineraries WHERE user_id = ?').get(req.user.id).c;

  res.json({ code: 0, data: { list, total, page: pageNum, limit: limitNum } });
});

router.get('/:id', authRequired, (req, res) => {
  const trip = db.prepare(`
    SELECT i.*, c.artist, c.tour_name, c.city, c.venue, c.concert_date
    FROM itineraries i
    LEFT JOIN concerts c ON i.concert_id = c.id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!trip) {
    return res.status(404).json({ code: 404, message: '行程不存在', data: null });
  }
  try {
    trip.flight_info = trip.flight_info ? JSON.parse(trip.flight_info) : null;
    trip.train_info = trip.train_info ? JSON.parse(trip.train_info) : null;
    trip.bus_info = trip.bus_info ? JSON.parse(trip.bus_info) : null;
    trip.taxi_info = trip.taxi_info ? JSON.parse(trip.taxi_info) : null;
    trip.hotel_info = trip.hotel_info ? JSON.parse(trip.hotel_info) : null;
  } catch {}
  res.json({ code: 0, data: trip });
});

router.post('/', authRequired, (req, res) => {
  const {
    concert_id, title, depart_city, dest_city, travel_date,
    flight_info, train_info, bus_info, taxi_info, hotel_info,
    check_in, check_out, total_budget, notes, is_public,
  } = req.body;

  const result = db.prepare(`
    INSERT INTO itineraries
      (user_id, concert_id, title, depart_city, dest_city, travel_date,
       flight_info, train_info, bus_info, taxi_info, hotel_info,
       check_in, check_out, total_budget, notes, is_public, share_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    concert_id || null,
    title || '',
    depart_city || '',
    dest_city || '',
    travel_date || '',
    flight_info ? JSON.stringify(flight_info) : '',
    train_info ? JSON.stringify(train_info) : '',
    bus_info ? JSON.stringify(bus_info) : '',
    taxi_info ? JSON.stringify(taxi_info) : '',
    hotel_info ? JSON.stringify(hotel_info) : '',
    check_in || '',
    check_out || '',
    total_budget || 0,
    notes || '',
    is_public ? 1 : 0,
    is_public ? genShareCode() : '',
  );

  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

router.put('/:id', authRequired, (req, res) => {
  const trip = db.prepare('SELECT id FROM itineraries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!trip) {
    return res.status(404).json({ code: 404, message: '行程不存在', data: null });
  }

  const {
    title, depart_city, dest_city, travel_date,
    flight_info, train_info, bus_info, taxi_info, hotel_info,
    check_in, check_out, total_budget, notes, is_public,
  } = req.body;

  let shareCode = undefined;
  if (is_public) {
    const existing = db.prepare('SELECT share_code FROM itineraries WHERE id = ?').get(req.params.id);
    if (!existing.share_code) shareCode = genShareCode();
  }

  db.prepare(`
    UPDATE itineraries SET
      title = COALESCE(?, title),
      depart_city = COALESCE(?, depart_city),
      dest_city = COALESCE(?, dest_city),
      travel_date = COALESCE(?, travel_date),
      flight_info = COALESCE(?, flight_info),
      train_info = COALESCE(?, train_info),
      bus_info = COALESCE(?, bus_info),
      taxi_info = COALESCE(?, taxi_info),
      hotel_info = COALESCE(?, hotel_info),
      check_in = COALESCE(?, check_in),
      check_out = COALESCE(?, check_out),
      total_budget = COALESCE(?, total_budget),
      notes = COALESCE(?, notes),
      is_public = COALESCE(?, is_public),
      share_code = COALESCE(?, share_code),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    title, depart_city, dest_city, travel_date,
    flight_info ? JSON.stringify(flight_info) : undefined,
    train_info ? JSON.stringify(train_info) : undefined,
    bus_info ? JSON.stringify(bus_info) : undefined,
    taxi_info ? JSON.stringify(taxi_info) : undefined,
    hotel_info ? JSON.stringify(hotel_info) : undefined,
    check_in, check_out, total_budget, notes,
    is_public !== undefined ? (is_public ? 1 : 0) : undefined,
    shareCode,
    req.params.id,
  );

  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', authRequired, (req, res) => {
  const result = db.prepare('DELETE FROM itineraries WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ code: 404, message: '行程不存在', data: null });
  }
  res.json({ code: 0, message: '删除成功' });
});

router.get('/share/:code', (req, res) => {
  const trip = db.prepare(`
    SELECT i.*, c.artist, c.tour_name, c.city, c.venue, c.concert_date,
           u.nickname as author_name, u.avatar_url as author_avatar
    FROM itineraries i
    LEFT JOIN concerts c ON i.concert_id = c.id
    LEFT JOIN users u ON i.user_id = u.id
    WHERE i.share_code = ? AND i.is_public = 1
  `).get(req.params.code);
  if (!trip) {
    return res.status(404).json({ code: 404, message: '分享的行程不存在或已取消分享', data: null });
  }
  try {
    trip.flight_info = trip.flight_info ? JSON.parse(trip.flight_info) : null;
    trip.train_info = trip.train_info ? JSON.parse(trip.train_info) : null;
    trip.bus_info = trip.bus_info ? JSON.parse(trip.bus_info) : null;
    trip.taxi_info = trip.taxi_info ? JSON.parse(trip.taxi_info) : null;
    trip.hotel_info = trip.hotel_info ? JSON.parse(trip.hotel_info) : null;
  } catch {}
  res.json({ code: 0, data: trip });
});

router.post('/:id/share', authRequired, (req, res) => {
  const trip = db.prepare('SELECT * FROM itineraries WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!trip) {
    return res.status(404).json({ code: 404, message: '行程不存在', data: null });
  }
  let code = trip.share_code;
  if (!code) {
    code = genShareCode();
    db.prepare('UPDATE itineraries SET is_public = 1, share_code = ? WHERE id = ?').run(code, req.params.id);
  } else if (!trip.is_public) {
    db.prepare('UPDATE itineraries SET is_public = 1 WHERE id = ?').run(req.params.id);
  }
  res.json({ code: 0, data: { share_code: code, url: '/trip-detail.html?share=' + code } });
});

module.exports = router;
