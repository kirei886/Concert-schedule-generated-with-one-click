/**
 * Cloudflare Workers 入口文件
 * 处理所有 API 请求
 */

import { Router } from 'itty-router';
import authRoutes from './routes/auth';
import settingsRoutes from './routes/settings';
import cmsRoutes from './routes/cms';
import notificationsRoutes from './routes/notifications';
import concertsRoutes from './routes/concerts';
import itinerariesRoutes from './routes/itineraries';
import messagesRoutes from './routes/messages';
import favoritesRoutes from './routes/favorites';
import ordersRoutes from './routes/orders';

// 创建路由器
const router = Router();

// CORS 处理
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// OPTIONS 请求处理
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// 健康检查
router.get('/api/health', () => {
  return jsonResponse({
    code: 0,
    message: 'OK',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// 注册路由 - 直接嵌套处理
router.all('/api/auth/*', (req) => authRoutes.handle(req));
router.all('/api/settings/*', (req) => settingsRoutes.handle(req));
router.all('/api/cms/*', (req) => cmsRoutes.handle(req));
router.all('/api/notifications/*', (req) => notificationsRoutes.handle(req));
router.all('/api/concerts/*', (req) => concertsRoutes.handle(req));
router.all('/api/itineraries/*', (req) => itinerariesRoutes.handle(req));
router.all('/api/messages/*', (req) => messagesRoutes.handle(req));
router.all('/api/favorites/*', (req) => favoritesRoutes.handle(req));
router.all('/api/orders/*', (req) => ordersRoutes.handle(req));

// 404 处理
router.all('*', () => {
  return jsonResponse({
    code: 404,
    message: '接口不存在',
    data: null
  }, 404);
});

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 将 env 附加到 request 对象
      request.env = env;
      request.ctx = ctx;

      // 处理请求
      const response = await router.handle(request);

      // 添加 CORS 头
      const newResponse = new Response(response.body, response);
      Object.keys(corsHeaders).forEach(key => {
        newResponse.headers.set(key, corsHeaders[key]);
      });

      return newResponse;
    } catch (error) {
      console.error('Worker Error:', error);
      return jsonResponse({
        code: 500,
        message: '服务器错误',
        data: { error: error.message }
      }, 500);
    }
  },
};

// 辅助函数：返回 JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
