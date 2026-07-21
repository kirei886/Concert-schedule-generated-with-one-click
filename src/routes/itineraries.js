/**
 * 行程路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/itineraries' });

// 获取我的行程列表
router.get('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const itineraries = await request.env.DB.prepare(`
      SELECT i.*, c.artist, c.city as concert_city, c.venue, c.concert_date
      FROM itineraries i
      LEFT JOIN concerts c ON i.concert_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(request.user.id, limit, offset).all();

    return successResponse({
      itineraries: itineraries.results || [],
      pagination: { page, limit, total: itineraries.results?.length || 0 }
    });
  } catch (error) {
    console.error('Get itineraries error:', error);
    return errorResponse('获取行程失败', 50001, 500);
  }
});

// 获取行程详情
router.get('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;
    
    const itinerary = await request.env.DB.prepare(`
      SELECT i.*, c.artist, c.city as concert_city, c.venue, c.concert_date
      FROM itineraries i
      LEFT JOIN concerts c ON i.concert_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).bind(id, request.user.id).first();

    if (!itinerary) {
      return errorResponse('行程不存在', 40401, 404);
    }

    return successResponse(itinerary);
  } catch (error) {
    return errorResponse('获取行程失败', 50001, 500);
  }
});

// 创建行程
router.post('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const {
      concert_id, title, depart_city, dest_city, travel_date,
      flight_info = '', train_info = '', bus_info = '', taxi_info = '',
      hotel_info = '', check_in = '', check_out = '', total_budget = 0,
      notes = '', is_public = 0
    } = body;

    const result = await request.env.DB.prepare(`
      INSERT INTO itineraries (
        user_id, concert_id, title, depart_city, dest_city, travel_date,
        flight_info, train_info, bus_info, taxi_info, hotel_info,
        check_in, check_out, total_budget, notes, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      request.user.id, concert_id, title, depart_city, dest_city, travel_date,
      flight_info, train_info, bus_info, taxi_info, hotel_info,
      check_in, check_out, total_budget, notes, is_public
    ).run();

    return successResponse({ id: result.meta.last_row_id }, '行程创建成功');
  } catch (error) {
    console.error('Create itinerary error:', error);
    return errorResponse('创建行程失败', 50001, 500);
  }
});

// 更新行程
router.put('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;
    const body = await request.json();

    const itinerary = await request.env.DB.prepare(
      'SELECT * FROM itineraries WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!itinerary) {
      return errorResponse('行程不存在', 40401, 404);
    }

    const updates = [];
    const values = [];
    const allowedFields = [
      'title', 'depart_city', 'dest_city', 'travel_date', 'flight_info',
      'train_info', 'bus_info', 'taxi_info', 'hotel_info', 'check_in',
      'check_out', 'total_budget', 'notes', 'is_public'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    });

    if (updates.length === 0) {
      return errorResponse('没有要更新的字段', 40001, 400);
    }

    updates.push(`updated_at = datetime('now')`);
    values.push(id);

    await request.env.DB.prepare(`
      UPDATE itineraries SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return successResponse(null, '更新成功');
  } catch (error) {
    return errorResponse('更新行程失败', 50001, 500);
  }
});

// 删除行程
router.delete('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const itinerary = await request.env.DB.prepare(
      'SELECT * FROM itineraries WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!itinerary) {
      return errorResponse('行程不存在', 40401, 404);
    }

    await request.env.DB.prepare('DELETE FROM itineraries WHERE id = ?').bind(id).run();

    return successResponse(null, '删除成功');
  } catch (error) {
    return errorResponse('删除行程失败', 50001, 500);
  }
});

export default router;
