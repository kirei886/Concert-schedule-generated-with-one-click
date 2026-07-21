/**
 * 认证路由 - Workers 版本
 * 示例实现
 */

import { Router } from 'itty-router';
import { authRequired } from '../middleware/auth.js';
import { generateToken } from '../utils/jwt.js';
import { dbGet, dbRun, jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api/auth' });

// 注册
router.post('/register', async (request) => {
  try {
    const body = await request.json();
    const { username, email, password, nickname } = body;

    // 验证输入
    if (!username || !email || !password) {
      return errorResponse('请填写完整信息', 40001, 400);
    }

    // 检查用户是否存在
    const existing = await request.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();

    if (existing) {
      return errorResponse('用户名或邮箱已存在', 40901, 409);
    }

    // 密码加密 - 使用 bcryptjs（需要安装）
    // 注意：Workers 中 bcryptjs 可能有性能问题
    // 生产环境建议使用 Web Crypto API
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password, 10);

    // 插入用户
    const result = await request.env.DB.prepare(`
      INSERT INTO users (username, email, password_hash, nickname)
      VALUES (?, ?, ?, ?)
    `).bind(username, email, hash, nickname || username).run();

    // 获取新用户
    const user = await request.env.DB.prepare(
      'SELECT id, username, email, nickname, role FROM users WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    // 生成 Token
    const token = await generateToken(user, request.env.JWT_SECRET);

    return successResponse({ token, user }, '注册成功');
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('注册失败', 50001, 500);
  }
});

// 登录
router.post('/login', async (request) => {
  try {
    const body = await request.json();
    const { account, password } = body;

    if (!account || !password) {
      return errorResponse('请输入账号和密码', 40001, 400);
    }

    // 查询用户
    const user = await request.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(account, account).first();

    if (!user) {
      return errorResponse('账号或密码错误', 40001, 400);
    }

    // 验证密码
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return errorResponse('账号或密码错误', 40001, 400);
    }

    // 生成 Token
    const token = await generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    }, request.env.JWT_SECRET);

    // 记录登录
    await request.env.DB.prepare(`
      INSERT INTO login_records (user_id, login_ip, user_agent, status)
      VALUES (?, ?, ?, 'success')
    `).bind(
      user.id,
      request.headers.get('CF-Connecting-IP') || '',
      request.headers.get('User-Agent') || ''
    ).run();

    return successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        role: user.role
      }
    }, '登录成功');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('登录失败', 50001, 500);
  }
});

// 获取当前用户信息
router.get('/me', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const user = await request.env.DB.prepare(
      'SELECT id, username, email, nickname, avatar_url, phone, fan_color, fan_name, fan_slogan, role FROM users WHERE id = ?'
    ).bind(request.user.id).first();

    if (!user) {
      return errorResponse('用户不存在', 40401, 404);
    }

    return successResponse(user);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('获取用户信息失败', 50001, 500);
  }
});

export default router;
