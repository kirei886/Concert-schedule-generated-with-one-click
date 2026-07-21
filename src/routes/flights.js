/**
 * 机票路由 - 龙虾 API 集成
 */

import { Router } from 'itty-router';
import { authRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';

const router = Router({ base: '/api' });

// 龙虾 API 基础配置
const LONGXIA_API_BASE = 'https://api.longxiachuxing.com';

// 辅助函数：调用龙虾 API
async function callLongxiaAPI(endpoint, method, body, token) {
  const url = `${LONGXIA_API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return await response.json();
}

// 生成订单号
function generateOrderNo() {
  return `FLT${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

// ========== 1. 机票搜索接口 ==========
router.post('/flight-search', async (request) => {
  try {
    const body = await request.json();
    const { origin, destination, date, cabin_class = 'economy', adult = 1 } = body;

    if (!origin || !destination || !date) {
      return errorResponse('请提供出发地、目的地和日期', 40001, 400);
    }

    // 调用龙虾搜索接口
    const longxiaData = await callLongxiaAPI(
      '/open/v1/flight/search',
      'POST',
      {
        trip_mode: 'domestic',
        trip_type: 'oneway',
        from_code: origin,
        to_code: destination,
        depart_date: date,
        cabin_class: cabin_class,
        passengers: {
          adult: adult,
          child: 0,
          infant: 0
        },
        page_size: 20,
        sort_by: 'price'
      },
      request.env.LONGXIA_TOKEN
    );

    if (longxiaData.code === 0) {
      return successResponse({
        flights: longxiaData.data.flights || [],
        search_id: longxiaData.data.search_id
      });
    } else {
      return errorResponse(longxiaData.message || '搜索失败', longxiaData.code, 400);
    }
  } catch (error) {
    console.error('Flight search error:', error);
    return errorResponse('搜索航班失败: ' + error.message, 50001, 500);
  }
});

// ========== 2. 报价接口 ==========
router.post('/flight-pricing', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const { search_offer_id, passengers } = body;

    if (!search_offer_id || !passengers) {
      return errorResponse('缺少必要参数', 40001, 400);
    }

    // 调用龙虾报价接口
    const longxiaData = await callLongxiaAPI(
      '/open/v1/flight/pricing',
      'POST',
      {
        search_offer_id,
        passengers
      },
      request.env.LONGXIA_TOKEN
    );

    return jsonResponse(longxiaData);
  } catch (error) {
    console.error('Flight pricing error:', error);
    return errorResponse('报价失败: ' + error.message, 50001, 500);
  }
});

// ========== 3. 创建机票订单（整合到现有订单接口） ==========
// 这部分会修改 orders.js 中的创建订单接口

// ========== 4. 查询龙虾订单详情 ==========
router.get('/flight-order/:system_no', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { system_no } = request.params;

    // 调用龙虾订单详情接口
    const longxiaData = await callLongxiaAPI(
      '/open/v1/flight/order/detail',
      'POST',
      {
        system_no
      },
      request.env.LONGXIA_TOKEN
    );

    if (longxiaData.code === 0) {
      return successResponse(longxiaData.data);
    } else {
      return errorResponse(longxiaData.message || '查询失败', longxiaData.code, 400);
    }
  } catch (error) {
    console.error('Get flight order error:', error);
    return errorResponse('查询订单失败: ' + error.message, 50001, 500);
  }
});

// ========== 5. 获取龙虾订单列表 ==========
router.get('/flight-orders', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const page_size = parseInt(url.searchParams.get('page_size') || '20');

    // 调用龙虾订单列表接口
    const longxiaData = await callLongxiaAPI(
      '/open/v1/flight/order/list',
      'POST',
      {
        page,
        page_size
      },
      request.env.LONGXIA_TOKEN
    );

    if (longxiaData.code === 0) {
      return successResponse(longxiaData.data);
    } else {
      return errorResponse(longxiaData.message || '查询失败', longxiaData.code, 400);
    }
  } catch (error) {
    console.error('Get flight orders error:', error);
    return errorResponse('查询订单列表失败: ' + error.message, 50001, 500);
  }
});

export default router;
export { callLongxiaAPI, generateOrderNo };
