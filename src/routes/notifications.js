/**
 * 通知路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/notifications' });

// 获取我的通知列表
router.get('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const is_read = url.searchParams.get('is_read');
    const type = url.searchParams.get('type');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT n.*, u.username as sender_username, u.nickname as sender_nickname
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.user_id = ?
    `;
    const params = [request.user.id];

    if (is_read !== null && is_read !== undefined) {
      sql += ' AND n.is_read = ?';
      params.push(parseInt(is_read));
    }

    if (type) {
      sql += ' AND n.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));
    const notifications = await stmt.all();

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams = [request.user.id];
    if (is_read !== null && is_read !== undefined) {
      countSql += ' AND is_read = ?';
      countParams.push(parseInt(is_read));
    }
    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    const countStmt = request.env.DB.prepare(countSql);
    countParams.forEach(p => countStmt.bind(p));
    const countResult = await countStmt.first();

    // 获取未读数量
    const unreadResult = await request.env.DB.prepare(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(request.user.id).first();

    return successResponse({
      notifications: notifications.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        unread_count: unreadResult?.unread_count || 0
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse('获取通知失败', 50001, 500);
  }
});

// 获取未读通知数量
router.get('/unread-count', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const result = await request.env.DB.prepare(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).bind(request.user.id).first();

    return successResponse({ unread_count: result?.unread_count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    return errorResponse('获取未读数量失败', 50001, 500);
  }
});

// 标记为已读
router.put('/:id/read', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const notification = await request.env.DB.prepare(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!notification) {
      return errorResponse('通知不存在', 40401, 404);
    }

    if (notification.is_read === 1) {
      return successResponse(null, '已经是已读状态');
    }

    await request.env.DB.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now')
      WHERE id = ?
    `).bind(id).run();

    return successResponse(null, '标记已读成功');
  } catch (error) {
    console.error('Mark read error:', error);
    return errorResponse('标记已读失败', 50001, 500);
  }
});

// 全部标记为已读
router.put('/read-all', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    await request.env.DB.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now')
      WHERE user_id = ? AND is_read = 0
    `).bind(request.user.id).run();

    return successResponse(null, '全部标记已读成功');
  } catch (error) {
    console.error('Mark all read error:', error);
    return errorResponse('标记已读失败', 50001, 500);
  }
});

// 删除通知
router.delete('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const notification = await request.env.DB.prepare(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!notification) {
      return errorResponse('通知不存在', 40401, 404);
    }

    await request.env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run();

    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete notification error:', error);
    return errorResponse('删除通知失败', 50001, 500);
  }
});

// 发送通知（管理员或系统）
router.post('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const {
      user_id,
      user_ids,
      type,
      title,
      content,
      link_url = '',
      related_type = '',
      related_id = null
    } = body;

    if (!type || !title || !content) {
      return errorResponse('type、title 和 content 不能为空', 40001, 400);
    }

    // 确定接收用户列表
    let recipients = [];
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      recipients = user_ids;
    } else if (user_id) {
      recipients = [user_id];
    } else if (request.user.role === 'admin') {
      // 管理员可以发送全站通知
      const allUsers = await request.env.DB.prepare('SELECT id FROM users').all();
      recipients = (allUsers.results || []).map(u => u.id);
    } else {
      return errorResponse('必须指定接收用户', 40001, 400);
    }

    // 批量插入通知
    const statements = recipients.map(uid => {
      return request.env.DB.prepare(`
        INSERT INTO notifications (user_id, type, title, content, link_url, sender_id, related_type, related_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(uid, type, title, content, link_url, request.user.id, related_type, related_id);
    });

    await request.env.DB.batch(statements);

    return successResponse(null, `通知发送成功，共 ${recipients.length} 人`);
  } catch (error) {
    console.error('Send notification error:', error);
    return errorResponse('发送通知失败', 50001, 500);
  }
});

// 获取通知详情
router.get('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const notification = await request.env.DB.prepare(`
      SELECT n.*, u.username as sender_username, u.nickname as sender_nickname
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.id = ? AND n.user_id = ?
    `).bind(id, request.user.id).first();

    if (!notification) {
      return errorResponse('通知不存在', 40401, 404);
    }

    // 自动标记为已读
    if (notification.is_read === 0) {
      await request.env.DB.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE id = ?
      `).bind(id).run();
      notification.is_read = 1;
    }

    return successResponse(notification);
  } catch (error) {
    console.error('Get notification error:', error);
    return errorResponse('获取通知详情失败', 50001, 500);
  }
});

// 管理员：查看所有通知记录
router.get('/admin/all', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const type = url.searchParams.get('type');
    const user_id = url.searchParams.get('user_id');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT n.*, u.username, u.nickname, s.username as sender_username
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      LEFT JOIN users s ON n.sender_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      sql += ' AND n.type = ?';
      params.push(type);
    }

    if (user_id) {
      sql += ' AND n.user_id = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));
    const notifications = await stmt.all();

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM notifications WHERE 1=1';
    const countParams = [];
    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }
    if (user_id) {
      countSql += ' AND user_id = ?';
      countParams.push(user_id);
    }

    const countStmt = request.env.DB.prepare(countSql);
    countParams.forEach(p => countStmt.bind(p));
    const countResult = await countStmt.first();

    return successResponse({
      notifications: notifications.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0
      }
    });
  } catch (error) {
    console.error('Get all notifications error:', error);
    return errorResponse('获取通知列表失败', 50001, 500);
  }
});

export default router;
