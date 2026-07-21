/**
 * CMS内容管理路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { adminRequired, authOptional } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/cms' });

// 获取内容列表
router.get('/contents', async (request) => {
  await authOptional(request);

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const keyword = url.searchParams.get('keyword');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT c.*, u.username as author_username, u.nickname as author_nickname
      FROM cms_contents c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // 非管理员只能看已发布的
    if (!request.user || request.user.role !== 'admin') {
      sql += ' AND c.status = ?';
      params.push('published');
    } else if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (category) {
      sql += ' AND c.category = ?';
      params.push(category);
    }

    if (keyword) {
      sql += ' AND (c.title LIKE ? OR c.content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY c.sort_order DESC, c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));
    const contents = await stmt.all();

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM cms_contents WHERE 1=1';
    const countParams = [];
    if (!request.user || request.user.role !== 'admin') {
      countSql += ' AND status = ?';
      countParams.push('published');
    } else if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    const countStmt = request.env.DB.prepare(countSql);
    countParams.forEach(p => countStmt.bind(p));
    const countResult = await countStmt.first();

    return successResponse({
      contents: contents.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0
      }
    });
  } catch (error) {
    console.error('Get contents error:', error);
    return errorResponse('获取内容失败', 50001, 500);
  }
});

// 获取内容详情（通过slug）
router.get('/:slug', async (request) => {
  await authOptional(request);

  try {
    const { slug } = request.params;

    const content = await request.env.DB.prepare(`
      SELECT c.*, u.username as author_username, u.nickname as author_nickname
      FROM cms_contents c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.slug = ?
    `).bind(slug).first();

    if (!content) {
      return errorResponse('内容不存在', 40401, 404);
    }

    // 非管理员只能查看已发布的
    if (content.status !== 'published' && (!request.user || request.user.role !== 'admin')) {
      return errorResponse('无权访问此内容', 40301, 403);
    }

    // 增加浏览次数
    await request.env.DB.prepare(
      'UPDATE cms_contents SET view_count = view_count + 1 WHERE id = ?'
    ).bind(content.id).run();

    content.view_count = (content.view_count || 0) + 1;

    return successResponse(content);
  } catch (error) {
    console.error('Get content error:', error);
    return errorResponse('获取内容失败', 50001, 500);
  }
});

// 创建内容（管理员）
router.post('/contents', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const {
      title,
      slug,
      content,
      content_type = 'markdown',
      category = 'page',
      excerpt = '',
      cover_image = '',
      status = 'draft',
      seo_title = '',
      seo_description = '',
      seo_keywords = '',
      sort_order = 0,
      is_featured = 0
    } = body;

    if (!title || !slug || !content) {
      return errorResponse('标题、slug和内容不能为空', 40001, 400);
    }

    // 检查slug是否已存在
    const exists = await request.env.DB.prepare(
      'SELECT id FROM cms_contents WHERE slug = ?'
    ).bind(slug).first();

    if (exists) {
      return errorResponse('slug已存在', 40901, 409);
    }

    const published_at = status === 'published' ? "datetime('now')" : 'NULL';

    const result = await request.env.DB.prepare(`
      INSERT INTO cms_contents (
        title, slug, content, content_type, category, excerpt, cover_image,
        status, seo_title, seo_description, seo_keywords, sort_order, is_featured,
        author_id, published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${published_at})
    `).bind(
      title, slug, content, content_type, category, excerpt, cover_image,
      status, seo_title, seo_description, seo_keywords, sort_order, is_featured,
      request.user.id
    ).run();

    // 记录日志
    await request.env.DB.prepare(`
      INSERT INTO admin_logs (user_id, action, module, target_type, target_id, description, created_at)
      VALUES (?, 'create', 'cms', 'content', ?, ?, datetime('now'))
    `).bind(request.user.id, result.meta.last_row_id, `创建内容：${title}`).run();

    return successResponse({ id: result.meta.last_row_id }, '创建成功');
  } catch (error) {
    console.error('Create content error:', error);
    return errorResponse('创建内容失败', 50001, 500);
  }
});

// 更新内容（管理员）
router.put('/contents/:id', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;
    const body = await request.json();

    const content = await request.env.DB.prepare(
      'SELECT * FROM cms_contents WHERE id = ?'
    ).bind(id).first();

    if (!content) {
      return errorResponse('内容不存在', 40401, 404);
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'title', 'slug', 'content', 'content_type', 'category', 'excerpt',
      'cover_image', 'status', 'seo_title', 'seo_description', 'seo_keywords',
      'sort_order', 'is_featured'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(body[field]);
      }
    });

    if (updateFields.length === 0) {
      return errorResponse('没有要更新的字段', 40001, 400);
    }

    // 如果状态改为published且之前未发布，设置发布时间
    if (body.status === 'published' && !content.published_at) {
      updateFields.push(`published_at = datetime('now')`);
    }

    updateFields.push(`updated_at = datetime('now')`);
    updateValues.push(id);

    await request.env.DB.prepare(`
      UPDATE cms_contents
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues).run();

    // 记录日志
    await request.env.DB.prepare(`
      INSERT INTO admin_logs (user_id, action, module, target_type, target_id, description, created_at)
      VALUES (?, 'update', 'cms', 'content', ?, ?, datetime('now'))
    `).bind(request.user.id, id, `更新内容：${content.title}`).run();

    return successResponse(null, '更新成功');
  } catch (error) {
    console.error('Update content error:', error);
    return errorResponse('更新内容失败', 50001, 500);
  }
});

// 删除内容（管理员）
router.delete('/contents/:id', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const content = await request.env.DB.prepare(
      'SELECT * FROM cms_contents WHERE id = ?'
    ).bind(id).first();

    if (!content) {
      return errorResponse('内容不存在', 40401, 404);
    }

    await request.env.DB.prepare(
      'DELETE FROM cms_contents WHERE id = ?'
    ).bind(id).run();

    // 记录日志
    await request.env.DB.prepare(`
      INSERT INTO admin_logs (user_id, action, module, target_type, target_id, description, created_at)
      VALUES (?, 'delete', 'cms', 'content', ?, ?, datetime('now'))
    `).bind(request.user.id, id, `删除内容：${content.title}`).run();

    return successResponse(null, '删除成功');
  } catch (error) {
    console.error('Delete content error:', error);
    return errorResponse('删除内容失败', 50001, 500);
  }
});

export default router;
