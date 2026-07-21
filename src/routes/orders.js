/**
 * 订单路由 - Workers 版本
 */

import { Router } from 'itty-router';
import { authRequired } from '../middleware/auth.js';
import { jsonResponse, errorResponse, successResponse } from '../utils/db.js';
import { callLongxiaAPI, generateOrderNo } from './flights.js';

const router = Router({ base: '/api/orders' });

// 获取我的订单列表
router.get('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [request.user.id];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = request.env.DB.prepare(sql);
    params.forEach(p => stmt.bind(p));
    const orders = await stmt.all();

    return successResponse({
      orders: orders.results || [],
      pagination: { page, limit, total: orders.results?.length || 0 }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return errorResponse('获取订单失败', 50001, 500);
  }
});

// 获取订单详情
router.get('/:id', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const order = await request.env.DB.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!order) {
      return errorResponse('订单不存在', 40401, 404);
    }

    // 如果是龙虾机票订单，获取最新状态
    if (order.longxia_order_no && order.item_type === 'flight') {
      try {
        const longxiaData = await callLongxiaAPI(
          '/open/v1/flight/order/detail',
          'POST',
          { system_no: order.longxia_order_no },
          request.env.LONGXIA_TOKEN
        );

        if (longxiaData.code === 0) {
          const longxiaOrder = longxiaData.data;

          // 更新本地订单状态
          let localStatus = 'pending';
          if (longxiaOrder.pay_status === 'paid') {
            localStatus = 'paid';
          }

          await request.env.DB.prepare(
            'UPDATE orders SET status = ?, pnr = ? WHERE id = ?'
          ).bind(localStatus, longxiaOrder.pnr || '', id).run();

          // 返回合并后的订单信息
          return successResponse({
            ...order,
            status: localStatus,
            pnr: longxiaOrder.pnr,
            flight_info: longxiaOrder.flight_info,
            pay_status: longxiaOrder.pay_status,
            flight_status: longxiaOrder.flight_status
          });
        }
      } catch (err) {
        console.error('查询龙虾订单失败:', err);
      }
    }

    return successResponse(order);
  } catch (error) {
    console.error('Get order error:', error);
    return errorResponse('获取订单失败', 50001, 500);
  }
});

// 创建订单
router.post('/', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const body = await request.json();
    const {
      itinerary_id = null,
      item_type,
      item_name,
      item_detail = '',
      item_snapshot = '',
      quantity = 1,
      unit_price,
      total_amount,
      contact_name = '',
      contact_phone = '',
      travel_date = '',
      // 机票相关字段
      offer_id = '',
      search_offer_id = '',
      passengers = [],
      contact = {},
      flight_no = '',
      departure_time = '',
      arrival_time = ''
    } = body;

    if (!item_type || !item_name) {
      return errorResponse('必填字段不能为空', 40001, 400);
    }

    // ========== 如果是机票订单，调用龙虾预订接口 ==========
    if (item_type === 'flight' && offer_id) {
      try {
        // 生成商户订单号
        const outTradeNo = generateOrderNo();

        // 调用龙虾预订接口
        const longxiaData = await callLongxiaAPI(
          '/open/v1/flight/order/create',
          'POST',
          {
            offer_id,
            out_trade_no: outTradeNo,
            passengers,
            contact,
            pay_mode: 'user_pay'
          },
          request.env.LONGXIA_TOKEN
        );

        if (longxiaData.code === 0) {
          const longxiaOrder = longxiaData.data;

          // 保存到我们的数据库
          const result = await request.env.DB.prepare(`
            INSERT INTO orders (
              order_no, user_id, itinerary_id, item_type, item_name,
              total_amount, status, longxia_order_no,
              passenger_name, passenger_id_card, passenger_phone,
              contact_name, contact_phone,
              flight_no, departure_time, arrival_time,
              offer_id, search_offer_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            outTradeNo,
            request.user.id,
            itinerary_id,
            'flight',
            item_name,
            longxiaOrder.total_amount || total_amount,
            'pending',
            longxiaOrder.system_no,
            passengers[0]?.name || '',
            passengers[0]?.id_number || '',
            passengers[0]?.phone || '',
            contact.name || contact_name,
            contact.phone || contact_phone,
            flight_no,
            departure_time,
            arrival_time,
            offer_id,
            search_offer_id
          ).run();

          const orderId = result.meta.last_row_id;

          return successResponse({
            id: orderId,
            order_no: outTradeNo,
            longxia_order_no: longxiaOrder.system_no,
            checkout_url: longxiaOrder.checkout_url
          }, '机票订单创建成功');
        } else {
          return errorResponse(longxiaData.message || '创建订单失败', longxiaData.code, 400);
        }
      } catch (err) {
        console.error('Create flight order error:', err);
        return errorResponse('创建机票订单失败: ' + err.message, 50001, 500);
      }
    }

    // ========== 其他类型的订单（原有逻辑） ==========
    if (!unit_price || !total_amount) {
      return errorResponse('必填字段不能为空', 40001, 400);
    }

    // 生成订单号
    const order_no = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const result = await request.env.DB.prepare(`
      INSERT INTO orders (
        order_no, user_id, itinerary_id, item_type, item_name, item_detail,
        item_snapshot, quantity, unit_price, total_amount, contact_name,
        contact_phone, travel_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      order_no, request.user.id, itinerary_id, item_type, item_name, item_detail,
      item_snapshot, quantity, unit_price, total_amount, contact_name,
      contact_phone, travel_date
    ).run();

    return successResponse({
      id: result.meta.last_row_id,
      order_no
    }, '订单创建成功');
  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse('创建订单失败', 50001, 500);
  }
});

// 取消订单
router.put('/:id/cancel', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const order = await request.env.DB.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!order) {
      return errorResponse('订单不存在', 40401, 404);
    }

    if (order.status !== 'pending') {
      return errorResponse('只能取消待支付的订单', 40001, 400);
    }

    await request.env.DB.prepare(`
      UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?
    `).bind(id).run();

    return successResponse(null, '订单已取消');
  } catch (error) {
    console.error('Cancel order error:', error);
    return errorResponse('取消订单失败', 50001, 500);
  }
});

// 订单支付
router.post('/:id/pay', async (request) => {
  const authResult = await authRequired(request);
  if (authResult.error) {
    return jsonResponse(authResult.body, authResult.status);
  }

  try {
    const { id } = request.params;

    const order = await request.env.DB.prepare(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    ).bind(id, request.user.id).first();

    if (!order) {
      return errorResponse('订单不存在', 40401, 404);
    }

    if (order.status !== 'pending') {
      return errorResponse('该订单不能支付', 40001, 400);
    }

    // 如果是龙虾机票订单
    if (order.longxia_order_no && order.item_type === 'flight') {
      const body = await request.json();
      const { pay_type = 'wechat_h5' } = body;

      try {
        // 调用龙虾支付接口
        const longxiaData = await callLongxiaAPI(
          '/open/v1/flight/order/pay',
          'POST',
          {
            system_no: order.longxia_order_no,
            pay_type: pay_type,
            return_url: `${request.headers.get('origin') || 'https://tripay-music-app.pages.dev'}/payment.html?order_id=${id}`
          },
          request.env.LONGXIA_TOKEN
        );

        if (longxiaData.code === 0) {
          // 保存支付参数到订单
          await request.env.DB.prepare(
            'UPDATE orders SET pay_url = ?, pay_method = ? WHERE id = ?'
          ).bind(JSON.stringify(longxiaData.data.pay_params), pay_type, id).run();

          return successResponse({
            order_id: parseInt(id),
            pay_params: longxiaData.data.pay_params,
            pay_type: longxiaData.data.pay_type,
            status: 'pending'
          }, '请跳转至支付页面');
        } else {
          return errorResponse(longxiaData.message || '支付失败', longxiaData.code, 400);
        }
      } catch (err) {
        console.error('Flight order payment error:', err);
        return errorResponse('支付失败: ' + err.message, 50001, 500);
      }
    }

    // 其他支付方式（原有逻辑 - 模拟支付）
    await request.env.DB.prepare(`
      UPDATE orders
      SET status = 'paid',
          paid_at = datetime('now'),
          pay_method = 'mock',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(id).run();

    return successResponse({
      order_id: parseInt(id),
      status: 'paid'
    }, '支付成功');
  } catch (error) {
    console.error('Pay order error:', error);
    return errorResponse('支付失败', 50001, 500);
  }
});

export default router;
