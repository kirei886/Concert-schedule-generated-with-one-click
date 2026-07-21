/**
 * Cloudflare Workers 入口文件 - 简化版本
 */

import { Router } from 'itty-router';

// 创建主路由器
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
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// OPTIONS 请求处理
router.options('*', () => new Response(null, { headers: corsHeaders }));

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

// 简单测试路由
router.get('/api/test', () => {
  return jsonResponse({
    code: 0,
    message: 'Test endpoint working',
    data: { test: true }
  });
});

// 404 处理
router.all('*', () => {
  return jsonResponse({
    code: 404,
    message: '接口不存在',
    data: null
  }, 404);
});

// Worker 主处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 附加 env 到 request
      request.env = env;
      request.ctx = ctx;

      // 处理请求
      const response = await router.handle(request);

      // 确保返回 Response 对象
      if (!response || !(response instanceof Response)) {
        return jsonResponse({
          code: 500,
          message: '内部错误：无效的响应',
          data: null
        }, 500);
      }

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
