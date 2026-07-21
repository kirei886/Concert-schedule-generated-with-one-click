/**
 * Cloudflare Workers 入口文件 - 适配 itty-router v5
 */

import { AutoRouter, error, json } from 'itty-router';

// 创建路由器
const router = AutoRouter();

// CORS 中间件
const withCors = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};

// 根路径 - 欢迎页面
router.get('/', () => {
  return new Response(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>演唱会行程生成器 API</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #7C3AED; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        .endpoint { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #7C3AED; }
        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
        .get { background: #61affe; color: white; }
        .post { background: #49cc90; color: white; }
        a { color: #7C3AED; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🎵 演唱会行程生成器 API</h1>
      <p>欢迎使用 Cloudflare Workers 驱动的全球加速 API</p>

      <h2>📋 可用端点</h2>

      <div class="endpoint">
        <span class="method get">GET</span>
        <a href="/api/health" target="_blank">/api/health</a>
        <p>健康检查</p>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <a href="/api/settings/public" target="_blank">/api/settings/public</a>
        <p>获取公开配置</p>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/auth/login</code>
        <p>用户登录</p>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <a href="/api/concerts" target="_blank">/api/concerts</a>
        <p>获取演唱会列表</p>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <a href="/api/cms/about" target="_blank">/api/cms/about</a>
        <p>获取CMS内容（示例：关于我们）</p>
      </div>

      <h2>🚀 技术栈</h2>
      <ul>
        <li>Cloudflare Workers - Serverless 计算</li>
        <li>Cloudflare D1 - 全球分布式数据库</li>
        <li>itty-router v5 - 轻量级路由</li>
      </ul>

      <h2>📊 状态</h2>
      <p>✅ 在线运行中 | 全球加速</p>

      <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
        <p>Powered by Cloudflare Workers | 部署时间: 2026-07-20</p>
      </footer>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

// 健康检查
router.get('/api/health', () => {
  return json({
    code: 0,
    message: 'OK',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// 获取公开配置
router.get('/api/settings/public', async (request, env) => {
  try {
    const result = await env.DB.prepare(
      'SELECT setting_key, setting_value FROM site_settings WHERE is_public = 1'
    ).all();

    const settings = {};
    (result.results || []).forEach(s => {
      settings[s.setting_key] = s.setting_value;
    });

    return json({ code: 0, message: 'success', data: settings });
  } catch (err) {
    return json({ code: 500, message: '获取配置失败', data: null }, { status: 500 });
  }
});

// 登录
router.post('/api/auth/login', async (request, env) => {
  try {
    const body = await request.json();
    const { account, password } = body;

    if (!account || !password) {
      return json({ code: 400, message: '请输入账号和密码', data: null }, { status: 400 });
    }

    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    ).bind(account, account).first();

    if (!user) {
      return json({ code: 400, message: '账号或密码错误', data: null }, { status: 400 });
    }

    // 简化：不验证密码，直接返回（生产环境需要 bcrypt）
    // 生成简单 token
    const token = btoa(JSON.stringify({ id: user.id, username: user.username, role: user.role }));

    return json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          role: user.role
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return json({ code: 500, message: '登录失败', data: null }, { status: 500 });
  }
});

// 获取演唱会列表
router.get('/api/concerts', async (request, env) => {
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM concerts ORDER BY concert_date DESC LIMIT 20'
    ).all();

    return json({
      code: 0,
      message: 'success',
      data: {
        concerts: result.results || [],
        pagination: { page: 1, limit: 20, total: result.results?.length || 0 }
      }
    });
  } catch (err) {
    return json({ code: 500, message: '获取演唱会列表失败', data: null }, { status: 500 });
  }
});

// 获取CMS内容
router.get('/api/cms/:slug', async (request, env) => {
  try {
    const { slug } = request.params;
    const content = await env.DB.prepare(
      'SELECT * FROM cms_contents WHERE slug = ? AND status = ?'
    ).bind(slug, 'published').first();

    if (!content) {
      return json({ code: 404, message: '内容不存在', data: null }, { status: 404 });
    }

    return json({ code: 0, message: 'success', data: content });
  } catch (err) {
    return json({ code: 500, message: '获取内容失败', data: null }, { status: 500 });
  }
});

// 404 处理
router.all('*', () => {
  return json({ code: 404, message: '接口不存在', data: null }, { status: 404 });
});

// 导出 Worker
export default {
  fetch: (request, ...args) =>
    router
      .fetch(request, ...args)
      .then(withCors)
      .catch(err => {
        console.error('Worker error:', err);
        return json({ code: 500, message: '服务器错误', data: null }, { status: 500 });
      })
};
