/**
 * 演唱会路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authOptional, adminRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/concerts' });

// 获取演唱会列表
router.get('/', async (request) => {
  await authOptional(request);

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const city = url.searchParams.get('city');
    const artist = url.searchParams.get('artist');
    const status = url.searchParams.get('status');
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM concerts WHERE 1=1';
    const params = [];

    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }

    if (artist) {
      sql += ' AND artist LIKE ?';
      params.push(`%${artist}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY concert_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));
    const concerts = await stmt.all();

    return successResponse({
      concerts: concerts.results || [],
      pagination: { page, limit, total: concerts.results?.length || 0 }
    });
  } catch (error) {
    console.error('Get concerts error:', error);
    return errorResponse('获取演唱会列表失败', 50001, 500);
  }
});

// 获取演唱会详情
router.get('/:id', async (request) => {
  try {
    const { id } = request.params;
    const concert = await request.env.DB.prepare('SELECT * FROM concerts WHERE id = ?').bind(id).first();
    
    if (!concert) {
      return errorResponse('演唱会不存在', 40401, 404);
    }
    
    return successResponse(concert);
  } catch (error) {
    return errorResponse('获取演唱会失败', 50001, 500);
  }
});

// 创建演唱会（管理员）
router.post('/', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const { artist, city, concert_date, venue = '', tour_name = '', start_time = '19:00', status = 'upcoming', tag = '' } = body;

    const result = await request.env.DB.prepare(`
      INSERT INTO concerts (artist, tour_name, city, venue, concert_date, start_time, status, tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(artist, tour_name, city, venue, concert_date, start_time, status, tag).run();

    return successResponse({ id: result.meta.last_row_id }, '创建成功');
  } catch (error) {
    return errorResponse('创建演唱会失败', 50001, 500);
  }
});

export default router;
