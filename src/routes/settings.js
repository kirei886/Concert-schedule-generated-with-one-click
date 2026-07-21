/**
 * 网站配置路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/settings' });

// 获取公开配置
router.get('/public', async (request) => {
  try {
    const result = await request.env.DB.prepare(`
      SELECT setting_key, setting_value, setting_type
      FROM site_settings
      WHERE is_public = 1
    `).all();

    const settings = {};
    result.results.forEach(s => {
      settings[s.setting_key] = s.setting_value;
    });

    return successResponse(settings);
  } catch (error) {
    console.error('Get public settings error:', error);
    return errorResponse('获取配置失败', 50001, 500);
  }
});

// 获取所有配置（管理员）
router.get('/', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { category } = request.query || {};

    let sql = 'SELECT * FROM site_settings';
    const params = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, setting_key';

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));

    const result = await stmt.all();

    return successResponse(result.results || []);
  } catch (error) {
    console.error('Get settings error:', error);
    return errorResponse('获取配置失败', 50001, 500);
  }
});

// 获取单个配置
router.get('/:key', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { key } = request.params;

    const setting = await request.env.DB.prepare(
      'SELECT * FROM site_settings WHERE setting_key = ?'
    ).bind(key).first();

    if (!setting) {
      return errorResponse('配置不存在', 40401, 404);
    }

    // 非管理员只能查看公开配置
    if (request.user.role !== 'admin' && setting.is_public === 0) {
      return errorResponse('无权查看此配置', 40301, 403);
    }

    return successResponse(setting);
  } catch (error) {
    console.error('Get setting error:', error);
    return errorResponse('获取配置失败', 50001, 500);
  }
});

// 更新配置（管理员）
router.put('/', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return errorResponse('updates 必须是非空数组', 40001, 400);
    }

    // 批量更新
    const statements = updates.map(item => {
      return request.env.DB.prepare(`
        UPDATE site_settings
        SET setting_value = ?, updated_at = datetime('now'), updated_by = ?
        WHERE setting_key = ?
      `).bind(item.setting_value, request.user.id, item.setting_key);
    });

    await request.env.DB.batch(statements);

    // 记录操作日志
    await request.env.DB.prepare(`
      INSERT INTO admin_logs (user_id, action, module, description, request_params, created_at)
      VALUES (?, 'update', 'settings', ?, ?, datetime('now'))
    `).bind(
      request.user.id,
      `更新了 ${updates.length} 项配置`,
      JSON.stringify(updates)
    ).run();

    return successResponse(null, '配置更新成功');
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('更新配置失败', 50001, 500);
  }
});

// 创建新配置（管理员）
router.post('/', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const {
      setting_key,
      setting_value,
      setting_type = 'text',
      category = 'general',
      description = '',
      is_public = 0
    } = body;

    if (!setting_key || !setting_value) {
      return errorResponse('setting_key 和 setting_value 不能为空', 40001, 400);
    }

    // 检查是否存在
    const exists = await request.env.DB.prepare(
      'SELECT id FROM site_settings WHERE setting_key = ?'
    ).bind(setting_key).first();

    if (exists) {
      return errorResponse('配置键已存在', 40901, 409);
    }

    const result = await request.env.DB.prepare(`
      INSERT INTO site_settings
      (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      setting_key, setting_value, setting_type, category, description, is_public, request.user.id
    ).run();

    // 记录日志
    await request.env.DB.prepare(`
      INSERT INTO admin_logs (user_id, action, module, target_id, description, created_at)
      VALUES (?, 'create', 'settings', ?, ?, datetime('now'))
    `).bind(request.user.id, result.meta.last_row_id, `创建配置：${setting_key}`).run();

    return successResponse({ id: result.meta.last_row_id }, '配置创建成功');
  } catch (error) {
    console.error('Create setting error:', error);
    return errorResponse('创建配置失败', 50001, 500);
  }
});

// 删除配置（管理员）
router.delete('/:key', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { key } = request.params;

    const setting = await request.env.DB.prepare(
      'SELECT * FROM site_settings WHERE setting_key = ?'
    ).bind(key).first();

    if (!setting) {
      return errorResponse('配置不存在', 40401, 404);
    }

    await request.env.DB.prepare(
      'DELETE FROM site_settings WHERE setting_key = ?'
    ).bind(key).run();

    // 记录日志
    await request.env.DB.prepare(`
      INSERT INTO admin_logs (user_id, action, module, target_id, description, created_at)
      VALUES (?, 'delete', 'settings', ?, ?, datetime('now'))
    `).bind(request.user.id, setting.id, `删除配置：${key}`).run();

    return successResponse(null, '配置删除成功');
  } catch (error) {
    console.error('Delete setting error:', error);
    return errorResponse('删除配置失败', 50001, 500);
  }
});

// 获取配置分类列表
router.get('/categories/list', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const result = await request.env.DB.prepare(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM site_settings
      GROUP BY category
      ORDER BY category
    `).all();

    return successResponse(result.results || []);
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse('获取分类失败', 50001, 500);
  }
});

export default router;
