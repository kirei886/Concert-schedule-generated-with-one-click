/**
 * 留言路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authRequired, authOptional } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/messages' });

// 获取留言列表
router.get('/', async (request) => {
  await authOptional(request);

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const artist = url.searchParams.get('artist');
    const tag = url.searchParams.get('tag');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.*, u.username, u.nickname, u.avatar_url,
             (SELECT COUNT(*) FROM message_likes WHERE message_id = m.id) as likes_count
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.parent_id IS NULL
    `;
    const params = [];

    if (artist) {
      sql += ' AND m.artist = ?';
      params.push(artist);
    }

    if (tag) {
      sql += ' AND m.tag = ?';
      params.push(tag);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));
    const messages = await stmt.all();

    // 获取每条留言的回复
    const messagesWithReplies = await Promise.all(
      (messages.results || []).map(async (msg) => {
        const replies = await request.env.DB.prepare(`
          SELECT m.*, u.username, u.nickname, u.avatar_url
          FROM messages m
          LEFT JOIN users u ON m.user_id = u.id
          WHERE m.parent_id = ?
          ORDER BY m.created_at ASC
        `).bind(msg.id).all();

        return { ...msg, replies: replies.results || [] };
      })
    );

    return successResponse({
      messages: messagesWithReplies,
      pagination: { page, limit, total: messages.results?.length || 0 }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return errorResponse('获取留言失败', 50001, 500);
  }
});

// 创建留言
router.post('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const { parent_id = null, concert_id = null, artist = '', tag = '', content, sticker = '' } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('留言内容不能为空', 40001, 400);
    }

    const result = await request.env.DB.prepare(`
      INSERT INTO messages (user_id, parent_id, concert_id, artist, tag, content, sticker)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(request.user.id, parent_id, concert_id, artist, tag, content, sticker).run();

    return successResponse({ id: result.meta.last_row_id }, '发布成功');
  } catch (error) {
    console.error('Create message error:', error);
    return errorResponse('发布留言失败', 50001, 500);
  }
});

// 点赞/取消点赞
router.post('/:id/like', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const message = await request.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
    if (!message) {
      return errorResponse('留言不存在', 40401, 404);
    }

    const existingLike = await request.env.DB.prepare(
      'SELECT * FROM message_likes WHERE message_id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (existingLike) {
      // 取消点赞
      await request.env.DB.prepare('DELETE FROM message_likes WHERE id = ?').bind(existingLike.id).run();
      await request.env.DB.prepare('UPDATE messages SET likes_count = likes_count - 1 WHERE id = ?').bind(id).run();
      return successResponse({ liked: false }, '已取消点赞');
    } else {
      // 点赞
      await request.env.DB.prepare(`
        INSERT INTO message_likes (message_id, user_id) VALUES (?, ?)
      `).bind(id, request.user.id).run();
      await request.env.DB.prepare('UPDATE messages SET likes_count = likes_count + 1 WHERE id = ?').bind(id).run();
      return successResponse({ liked: true }, '点赞成功');
    }
  } catch (error) {
    console.error('Like message error:', error);
    return errorResponse('操作失败', 50001, 500);
  }
});

// 删除留言
router.delete('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const message = await request.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
    if (!message) {
      return errorResponse('留言不存在', 40401, 404);
    }

    // 只能删除自己的留言或管理员可以删除任何留言
    if (message.user_id !== request.user.id && request.user.role !== 'admin') {
      return errorResponse('无权删除此留言', 40301, 403);
    }

    await request.env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();

    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete message error:', error);
    return errorResponse('删除留言失败', 50001, 500);
  }
});

export default router;
