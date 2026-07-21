/**
 * Cloudflare Workers 入口文件 - 完整版
 * 直接在主路由中定义所有 API
 */

import { Router } from 'itty-router';
import { verifyToken } from './utils/jwt.js';

const router = Router();

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function errorResponse(message, code = 500, status = 500) {
  return jsonResponse({ code, message, data: null }, status);
}

function successResponse(data = null, message = 'success') {
  return jsonResponse({ code: 0, message, data });
}

// 认证中间件
async function authRequired(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: true, status: 401, body: { code: 401, message: '请先登录', data: null } };
  }
  try {
    const token = authHeader.substring(7);
    const decoded = await verifyToken(token, request.env.JWT_SECRET);
    request.user = decoded;
    return { error: false };
  } catch (error) {
    return { error: true, status: 401, body: { code: 401, message: '登录已过期', data: null } };
  }
}

async function adminRequired(request) {
  const authResult = await authRequired(request);
  if (authResult.error) return authResult;
  if (!request.user || request.user.role !== 'admin') {
    return { error: true, status: 403, body: { code: 403, message: '需要管理员权限', data: null } };
  }
  return { error: false };
}

// OPTIONS 处理
router.options('*', () => new Response(null, { headers: corsHeaders }));

// 健康检查
router.get('/api/health', () => {
  return successResponse({ status: 'healthy', timestamp: new Date().toISOString() }, 'OK');
});

// ========== 认证 API ==========
// 登录
router.post('/api/auth/login', async (request) => {
  try {
    const body = await request.json();
    const { account, password } = body;

    if (!account || !password) {
      return errorResponse('请输入账号和密码', 40001, 400);
    }

    const user = await request.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(account, account).first();

    if (!user) {
      return errorResponse('账号或密码错误', 40001, 400);
    }

    // 验证密码（简化版，生产环境需要 bcrypt）
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return errorResponse('账号或密码错误', 40001, 400);
    }

    // 生成 Token
    const { generateToken } = await import('./utils/jwt.js');
    const token = await generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    }, request.env.JWT_SECRET);

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

// 获取当前用户
router.get('/api/auth/me', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) return jsonResponse(authResult.body, authResult.status);

  try {
    const user = await request.env.DB.prepare(
      'SELECT id, username, email, nickname, avatar_url, role FROM users WHERE id = ?'
    ).bind(request.user.id).first();

    if (!user) return errorResponse('用户不存在', 40401, 404);
    return successResponse(user);
  } catch (error) {
    return errorResponse('获取用户信息失败', 50001, 500);
  }
});

// ========== 网站配置 API ==========
// 获取公开配置
router.get('/api/settings/public', async (request) => {
  try {
    const result = await request.env.DB.prepare(
      'SELECT setting_key, setting_value FROM site_settings WHERE is_public = 1'
    ).all();

    const settings = {};
    (result.results || []).forEach(s => {
      settings[s.setting_key] = s.setting_value;
    });

    return successResponse(settings);
  } catch (error) {
    return errorResponse('获取配置失败', 50001, 500);
  }
});

// 获取所有配置（管理员）
router.get('/api/settings', async (request) => {
  const authResult = await adminRequired(request);
  if (authResult.error) return jsonResponse(authResult.body, authResult.status);

  try {
    const result = await request.env.DB.prepare('SELECT * FROM site_settings ORDER BY category, setting_key').all();
    return successResponse(result.results || []);
  } catch (error) {
    return errorResponse('获取配置失败', 50001, 500);
  }
});

// ========== CMS API ==========
// 获取CMS内容详情
router.get('/api/cms/:slug', async (request) => {
  try {
    const { slug } = request.params;
    const content = await request.env.DB.prepare(
      'SELECT * FROM cms_contents WHERE slug = ? AND status = ?'
    ).bind(slug, 'published').first();

    if (!content) return errorResponse('内容不存在', 40401, 404);

    // 增加浏览量
    await request.env.DB.prepare(
      'UPDATE cms_contents SET view_count = view_count + 1 WHERE id = ?'
    ).bind(content.id).run();

    return successResponse(content);
  } catch (error) {
    return errorResponse('获取内容失败', 50001, 500);
  }
});

// ========== 演唱会 API ==========
// 获取演唱会列表
router.get('/api/concerts', async (request) => {
  try {
    const result = await request.env.DB.prepare(
      'SELECT * FROM concerts ORDER BY concert_date DESC LIMIT 20'
    ).all();

    return successResponse({
      concerts: result.results || [],
      pagination: { page: 1, limit: 20, total: result.results?.length || 0 }
    });
  } catch (error) {
    return errorResponse('获取演唱会列表失败', 50001, 500);
  }
});

// 404 处理
router.all('*', () => {
  return errorResponse('接口不存在: ' + new URL(request.url).pathname, 404, 404);
});

// Worker 主处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      request.env = env;
      request.ctx = ctx;

      const response = await router.handle(request);

      if (!response) {
        return errorResponse('无效的响应', 500, 500);
      }

      // 添加 CORS 头
      const newResponse = new Response(response.body, response);
      Object.keys(corsHeaders).forEach(key => {
        newResponse.headers.set(key, corsHeaders[key]);
      });

      return newResponse;
    } catch (error) {
      console.error('Worker Error:', error);
      return errorResponse('服务器错误: ' + error.message, 500, 500);
    }
  },
};
