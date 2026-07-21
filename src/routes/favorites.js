/**
 * 收藏路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/favorites' });

// 获取我的收藏列表
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

    const favorites = await request.env.DB.prepare(`
      SELECT f.*, c.artist, c.tour_name, c.city, c.venue, c.concert_date, c.start_time, c.status
      FROM favorites f
      LEFT JOIN concerts c ON f.concert_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(request.user.id, limit, offset).all();

    return successResponse({
      favorites: favorites.results || [],
      pagination: { page, limit, total: favorites.results?.length || 0 }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return errorResponse('获取收藏失败', 50001, 500);
  }
});

// 添加收藏
router.post('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const { concert_id } = body;

    if (!concert_id) {
      return errorResponse('演唱会ID不能为空', 40001, 400);
    }

    // 检查演唱会是否存在
    const concert = await request.env.DB.prepare('SELECT * FROM concerts WHERE id = ?').bind(concert_id).first();
    if (!concert) {
      return errorResponse('演唱会不存在', 40401, 404);
    }

    // 检查是否已收藏
    const existing = await request.env.DB.prepare(
      'SELECT * FROM favorites WHERE user_id = ? AND concert_id = ?'
    ).bind(request.user.id, concert_id).first();

    if (existing) {
      return errorResponse('已经收藏过了', 40901, 409);
    }

    const result = await request.env.DB.prepare(`
      INSERT INTO favorites (user_id, concert_id) VALUES (?, ?)
    `).bind(request.user.id, concert_id).run();

    return successResponse({ id: result.meta.last_row_id }, '收藏成功');
  } catch (error) {
    console.error('Add favorite error:', error);
    return errorResponse('收藏失败', 50001, 500);
  }
});

// 取消收藏
router.delete('/:concert_id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { concert_id } = request.params;

    const favorite = await request.env.DB.prepare(
      'SELECT * FROM favorites WHERE user_id = ? AND concert_id = ?'
    ).bind(request.user.id, concert_id).first();

    if (!favorite) {
      return errorResponse('未收藏此演唱会', 40401, 404);
    }

    await request.env.DB.prepare('DELETE FROM favorites WHERE id = ?').bind(favorite.id).run();

    return successResponse(null, '取消收藏成功');
  } catch (error) {
    console.error('Remove favorite error:', error);
    return errorResponse('取消收藏失败', 50001, 500);
  }
});

// 检查是否已收藏
router.get('/check/:concert_id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { concert_id } = request.params;

    const favorite = await request.env.DB.prepare(
      'SELECT * FROM favorites WHERE user_id = ? AND concert_id = ?'
    ).bind(request.user.id, concert_id).first();

    return successResponse({ is_favorited: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    return errorResponse('检查收藏失败', 50001, 500);
  }
});

export default router;
