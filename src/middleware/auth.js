/**
 * 认证中间件 - Workers 版本
 */

import { verifyToken } from '../utils/jwt.js';

// 认证中间件 - 必须登录
export async function authRequired(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: true,
      status: 401,
      body: { code: 401, message: '请先登录', data: null }
    };
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await verifyToken(token, request.env.JWT_SECRET);
    request.user = decoded;
    return { error: false };
  } catch (error) {
    return {
      error: true,
      status: 401,
      body: { code: 401, message: '登录已过期，请重新登录', data: null }
    };
  }
}

// 管理员权限中间件
export async function adminRequired(request) {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return authResult;
  }

  if (!request.user || request.user.role !== 'admin') {
    return {
      error: true,
      status: 403,
      body: { code: 403, message: '需要管理员权限', data: null }
    };
  }

  return { error: false };
}

// 可选认证中间件
export async function authOptional(request) {
  const authHeader = request.headers.get('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = await verifyToken(token, request.env.JWT_SECRET);
      request.user = decoded;
    } catch (error) {
      // 忽略错误，当作未登录处理
    }
  }

  return { error: false };
}
