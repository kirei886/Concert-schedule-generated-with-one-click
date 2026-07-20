/**
 * 订单路由：创建/支付/查询/退订
 * 支持龙虾平台真实支付和本地模拟支付
 */
const express = require('express');
const https = require('https');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// 龙虾平台配置
const API_TOKEN = process.env.LONGXIA_TOKEN || 'rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk';
const API_HOST = 'api.longxiachuxing.com';

// 调用龙虾平台API
function callLongxiaApi(apiPath, method, bodyData) {
  return new Promise((resolve, reject) => {
    const bodyStr = bodyData ? JSON.stringify(bodyData) : null;
    const options = {
      hostname: API_HOST,
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };
    if (bodyStr) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ code: -1, message: '响应解析失败', raw: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// 生成订单号: ORD + 年月日时分秒 + 4位随机
function genOrderNo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD${ts}${rand}`;
}

// 查找或创建行程：购买时自动关联行程，保证用户购买后仍能查看完整出行方案
// 去重逻辑：同一用户 + 同一出行日期 + 相同出发/目的城市，且 2 小时内已创建的行程直接复用
function findOrCreateItinerary(userId, trip) {
  const { depart_city, dest_city, travel_date } = trip;

  if (travel_date && depart_city && dest_city) {
    const recent = db.prepare(`
      SELECT id FROM itineraries
      WHERE user_id = ? AND travel_date = ? AND depart_city = ? AND dest_city = ?
        AND created_at > datetime('now','localtime','-2 hours')
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, travel_date, depart_city, dest_city);
    if (recent) return recent.id;
  }

  // 计算预算总额
  let totalBudget = 0;
  for (const key of ['flight_info', 'train_info', 'bus_info', 'taxi_info', 'hotel_info']) {
    if (trip[key] && trip[key]._price != null) totalBudget += parseFloat(trip[key]._price) || 0;
  }
  if (trip.total_budget != null) totalBudget = parseFloat(trip.total_budget) || totalBudget;

  const title = trip.title || `${dest_city || ''}演唱会行程`.trim();
  const result = db.prepare(`
    INSERT INTO itineraries
      (user_id, title, depart_city, dest_city, travel_date,
       flight_info, train_info, bus_info, taxi_info, hotel_info,
       check_in, check_out, total_budget, notes, is_public, share_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, '')
  `).run(
    userId,
    title,
    depart_city || '',
    dest_city || '',
    travel_date || '',
    trip.flight_info ? JSON.stringify(trip.flight_info) : '',
    trip.train_info ? JSON.stringify(trip.train_info) : '',
    trip.bus_info ? JSON.stringify(trip.bus_info) : '',
    trip.taxi_info ? JSON.stringify(trip.taxi_info) : '',
    trip.hotel_info ? JSON.stringify(trip.hotel_info) : '',
    trip.check_in || travel_date || '',
    trip.check_out || (travel_date ? getNextDateStr(travel_date) : ''),
    totalBudget,
  );
  return result.lastInsertRowid;
}

// 计算 YYYY-MM-DD 的次日
function getNextDateStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 创建订单
router.post('/', authRequired, [
  body('item_type').isIn(['flight', 'train', 'bus', 'taxi', 'hotel']).withMessage('商品类型无效'),
  body('item_name').notEmpty().withMessage('商品名称不能为空'),
  body('unit_price').isFloat({ min: 0 }).withMessage('单价必须大于等于0'),
  body('quantity').optional().isInt({ min: 1, max: 10 }).withMessage('数量1-10'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: errors.array()[0].msg, data: null });
  }

  const { item_type, item_name, item_detail, item_snapshot, unit_price, quantity, contact_name, contact_phone, travel_date, offer_id, passengers, guests } = req.body;
  const qty = quantity || 1;
  const total = parseFloat(unit_price) * qty;

  // 自动创建/复用行程并关联订单，确保购买后仍可在"我的行程"查看完整方案
  let itineraryId = null;
  const trip = req.body.trip_context || {};
  if (trip.travel_date || trip.depart_city || trip.dest_city ||
      trip.flight_info || trip.train_info || trip.bus_info || trip.taxi_info || trip.hotel_info) {
    try {
      itineraryId = findOrCreateItinerary(req.user.id, trip);
    } catch (e) {
      console.error('[orders] 自动创建行程失败:', e.message);
    }
  }

  const orderNo = genOrderNo();
  
  // 调用龙虾平台下单（如果有 offer_id）
  let platformOrderNo = '';
  let payUrl = '';
  let platformStatus = '';
  
  if (offer_id) {
    try {
      const outTradeNo = orderNo;
      let platformResult;
      
      if (item_type === 'flight') {
        platformResult = await callLongxiaApi('/open/v1/flight/order/create', 'POST', {
          offer_id: offer_id,
          out_trade_no: outTradeNo,
          contact: { name: contact_name || '预订人', phone: contact_phone || '' },
          passengers: passengers || [{ name: '预订人', id_card: '' }],
          callback_url: `${req.protocol}://${req.get('host')}/api/orders/callback`,
        });
      } else if (item_type === 'hotel') {
        platformResult = await callLongxiaApi('/open/v1/hotel/order/create', 'POST', {
          offer_id: offer_id,
          out_trade_no: outTradeNo,
          contact: { name: contact_name || '预订人', phone: contact_phone || '' },
          guests: guests || [{ name: '预订人' }],
          callback_url: `${req.protocol}://${req.get('host')}/api/orders/callback`,
        });
      } else if (item_type === 'taxi') {
        platformResult = await callLongxiaApi('/open/v1/taxi/order/create', 'POST', {
          contact_phone: contact_phone || '',
          offer_id: offer_id,
          out_trade_no: outTradeNo,
          pay_channel: 'user_pay',
          contact_name: contact_name || '',
          callback_url: `${req.protocol}://${req.get('host')}/api/orders/callback`,
        });
      } else if (item_type === 'train') {
        platformResult = await callLongxiaApi('/open/v1/train/order/create', 'POST', {
          offer_id: offer_id,
          out_trade_no: outTradeNo,
          contact: { name: contact_name || '预订人', phone: contact_phone || '' },
          passengers: passengers || [{ name: '预订人', id_card: '' }],
          callback_url: `${req.protocol}://${req.get('host')}/api/orders/callback`,
        });
      } else if (item_type === 'bus') {
        platformResult = await callLongxiaApi('/open/v1/bus/order/create', 'POST', {
          offer_id: offer_id,
          out_trade_no: outTradeNo,
          contact: { name: contact_name || '预订人', phone: contact_phone || '' },
          passengers: passengers || [{ name: '预订人', id_card: '' }],
          callback_url: `${req.protocol}://${req.get('host')}/api/orders/callback`,
        });
      }
      
      if (platformResult && platformResult.code === 0 && platformResult.data) {
        platformOrderNo = platformResult.data.order_no || platformResult.data.order_id || '';
        payUrl = platformResult.data.pay_url || platformResult.data.payment_url || '';
        platformStatus = platformResult.data.status || '';
        console.log(`[orders] 龙虾平台下单成功: ${platformOrderNo}, pay_url: ${payUrl ? '有' : '无'}`);
      } else {
        console.warn(`[orders] 龙虾平台下单失败: ${platformResult?.message || '未知错误'}`);
      }
    } catch (e) {
      console.error('[orders] 调用龙虾平台下单异常:', e.message);
    }
  }

  const result = db.prepare(`
    INSERT INTO orders (order_no, user_id, item_type, item_name, item_detail, item_snapshot,
      quantity, unit_price, total_amount, contact_name, contact_phone, travel_date, status, itinerary_id,
      platform_order_no, pay_url, offer_id, platform_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `).run(orderNo, req.user.id, item_type, item_name, item_detail || '', JSON.stringify(item_snapshot || {}),
    qty, parseFloat(unit_price), total, contact_name || '', contact_phone || '', travel_date || '', itineraryId,
    platformOrderNo, payUrl, offer_id || '', platformStatus);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  res.json({ code: 0, data: order });
});

// 支付订单（支持真实支付和模拟支付）
router.post('/:id/pay', authRequired, async (req, res) => {
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在', data: null });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ code: 400, message: `订单状态为${order.status}，无法支付`, data: null });
  }

  const isAdmin = req.user.role === 'admin';
  
  // 如果有龙虾平台支付URL，返回支付链接让前端跳转
  if (order.pay_url) {
    return res.json({
      code: 0,
      data: { ...order, pay_url: order.pay_url },
      message: '请跳转至支付页面完成支付',
    });
  }

  // 管理员免支付直接成功
  if (isAdmin) {
    db.prepare(`
      UPDATE orders SET status = 'paid', pay_method = 'admin_skip', paid_at = datetime('now','localtime'),
        updated_at = datetime('now','localtime') WHERE id = ?
    `).run(orderId);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    return res.json({
      code: 0,
      data: updated,
      message: '管理员免支付，订单已完成'
    });
  }

  // 没有龙虾平台支付链接且不是管理员，使用模拟支付
  const { pay_method } = req.body;
  const method = pay_method || 'wechat';

  db.prepare(`
    UPDATE orders SET status = 'paid', pay_method = ?, paid_at = datetime('now','localtime'),
      updated_at = datetime('now','localtime') WHERE id = ?
  `).run(method, orderId);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  res.json({
    code: 0,
    data: updated,
    message: '支付成功'
  });
});

// 查询龙虾平台订单状态
router.post('/:id/sync-status', authRequired, async (req, res) => {
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在', data: null });
  }
  if (!order.platform_order_no) {
    return res.status(400).json({ code: 400, message: '该订单未关联龙虾平台订单', data: null });
  }

  try {
    let apiPath = '';
    if (order.item_type === 'flight') {
      apiPath = '/open/v1/flight/order/query';
    } else if (order.item_type === 'hotel') {
      apiPath = '/open/v1/hotel/order/query';
    } else if (order.item_type === 'taxi') {
      apiPath = '/open/v1/taxi/order/query';
    } else if (order.item_type === 'train') {
      apiPath = '/open/v1/train/order/query';
    } else if (order.item_type === 'bus') {
      apiPath = '/open/v1/bus/order/query';
    }

    if (!apiPath) {
      return res.status(400).json({ code: 400, message: '不支持的商品类型', data: null });
    }

    const result = await callLongxiaApi(apiPath, 'POST', {
      order_no: order.platform_order_no,
      out_trade_no: order.order_no,
    });

    if (result && result.code === 0 && result.data) {
      const platformStatus = result.data.status || '';
      let localStatus = order.status;
      
      if (platformStatus === 'paid' || platformStatus === 'completed' || platformStatus === 'success') {
        localStatus = 'paid';
      } else if (platformStatus === 'refunded' || platformStatus === 'refund_success') {
        localStatus = 'refunded';
      } else if (platformStatus === 'cancelled' || platformStatus === 'failed') {
        localStatus = 'cancelled';
      }

      if (localStatus !== order.status) {
        db.prepare(`
          UPDATE orders SET status = ?, platform_status = ?, callback_data = ?,
            updated_at = datetime('now','localtime') WHERE id = ?
        `).run(localStatus, platformStatus, JSON.stringify(result.data), orderId);
      }

      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      res.json({
        code: 0,
        data: { ...updated, platform_data: result.data },
        message: `订单状态已同步: ${platformStatus}`
      });
    } else {
      res.status(500).json({ code: 500, message: '查询龙虾平台订单失败', data: null });
    }
  } catch (e) {
    console.error('[orders] 同步订单状态失败:', e.message);
    res.status(500).json({ code: 500, message: '同步订单状态失败', data: null });
  }
});

// 查询退改费用（调用龙虾平台）
router.post('/:id/refund-fee', authRequired, async (req, res) => {
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在', data: null });
  }

  const typeMap = { flight: '机票', train: '高铁/火车', bus: '城际巴士', hotel: '酒店', taxi: '打车' };
  const typeName = typeMap[order.item_type] || order.item_type;

  if (order.platform_order_no) {
    try {
      let apiPath = '';
      if (order.item_type === 'flight') {
        apiPath = '/open/v1/flight/order/refund-fee';
      } else if (order.item_type === 'hotel') {
        apiPath = '/open/v1/hotel/order/refund-fee';
      } else if (order.item_type === 'taxi') {
        apiPath = '/open/v1/taxi/order/refund-fee';
      } else if (order.item_type === 'train') {
        apiPath = '/open/v1/train/order/refund-fee';
      } else if (order.item_type === 'bus') {
        apiPath = '/open/v1/bus/order/refund-fee';
      }

      if (apiPath) {
        const result = await callLongxiaApi(apiPath, 'POST', {
          order_no: order.platform_order_no,
          out_trade_no: order.order_no,
        });

        if (result && result.code === 0 && result.data) {
          const fee = result.data;
          res.json({
            code: 0,
            data: {
              platform_order_no: order.platform_order_no,
              can_refund: true,
              refund_fee: fee.refund_fee || fee.fee || 0,
              refund_amount: fee.refund_amount || (order.total_amount - (fee.refund_fee || fee.fee || 0)),
              original_amount: order.total_amount,
              fee_description: fee.fee_description || fee.description || '',
              type_name: typeName,
            },
            message: ''
          });
          return;
        }
      }
    } catch (e) {
      console.error('[orders] 查询龙虾平台退改费用失败:', e.message);
    }
  }

  const refundFee = calculateRefundFee(order);
  res.json({
    code: 0,
    data: {
      platform_order_no: order.platform_order_no || '',
      can_refund: true,
      refund_fee: refundFee,
      refund_amount: order.total_amount - refundFee,
      original_amount: order.total_amount,
      fee_description: getFeeDescription(order.item_type, refundFee),
      type_name: typeName,
    },
    message: order.platform_order_no ? '龙虾平台查询失败，显示估算费用' : '显示估算退改费用'
  });
});

// 根据订单类型计算退改费用（本地估算）
function calculateRefundFee(order) {
  const now = new Date();
  const travelDate = order.travel_date ? new Date(order.travel_date) : new Date();
  const daysBefore = Math.ceil((travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (order.item_type === 'flight') {
    if (daysBefore >= 7) return order.total_amount * 0.05;
    if (daysBefore >= 4) return order.total_amount * 0.1;
    if (daysBefore >= 2) return order.total_amount * 0.2;
    if (daysBefore >= 1) return order.total_amount * 0.3;
    return order.total_amount * 0.5;
  }

  if (order.item_type === 'train') {
    if (daysBefore >= 8) return 0;
    if (daysBefore >= 4) return order.total_amount * 0.05;
    if (daysBefore >= 2) return order.total_amount * 0.1;
    if (daysBefore >= 1) return order.total_amount * 0.2;
    return order.total_amount * 0.5;
  }

  if (order.item_type === 'bus') {
    if (daysBefore >= 3) return order.total_amount * 0.05;
    if (daysBefore >= 1) return order.total_amount * 0.1;
    return order.total_amount * 0.2;
  }

  if (order.item_type === 'hotel') {
    if (daysBefore >= 3) return 0;
    if (daysBefore >= 1) return order.total_amount * 0.1;
    return order.total_amount * 0.3;
  }

  if (order.item_type === 'taxi') {
    if (daysBefore >= 1) return 0;
    return order.total_amount * 0.2;
  }

  return order.total_amount * 0.1;
}

// 获取退改费用描述
function getFeeDescription(itemType, fee) {
  const typeDesc = {
    flight: '机票',
    train: '高铁',
    bus: '巴士',
    hotel: '酒店',
    taxi: '打车'
  };
  if (fee === 0) return `${typeDesc[itemType] || '订单'}距出行日期较远，免手续费`;
  return `${typeDesc[itemType] || '订单'}退改手续费 ¥${fee.toFixed(2)}`;
}

// 龙虾平台支付回调接口
router.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body;
    console.log('[orders] 收到支付回调:', JSON.stringify(callbackData));

    const outTradeNo = callbackData.out_trade_no || callbackData.order_no || '';
    if (!outTradeNo) {
      return res.status(400).json({ code: 400, message: '缺少订单号' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(outTradeNo);
    if (!order) {
      console.warn('[orders] 回调订单不存在:', outTradeNo);
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    const platformStatus = callbackData.status || callbackData.pay_status || '';
    let localStatus = order.status;

    if (platformStatus === 'paid' || platformStatus === 'completed' || platformStatus === 'success') {
      localStatus = 'paid';
    } else if (platformStatus === 'refunded' || platformStatus === 'refund_success') {
      localStatus = 'refunded';
    } else if (platformStatus === 'cancelled' || platformStatus === 'failed') {
      localStatus = 'cancelled';
    }

    if (localStatus !== order.status) {
      db.prepare(`
        UPDATE orders SET status = ?, platform_status = ?, callback_data = ?,
          updated_at = datetime('now','localtime') WHERE id = ?
      `).run(localStatus, platformStatus, JSON.stringify(callbackData), order.id);
      
      if (localStatus === 'paid') {
        db.prepare(`
          UPDATE orders SET pay_method = ?, paid_at = datetime('now','localtime') WHERE id = ?
        `).run(callbackData.pay_method || 'platform', order.id);
      }
    }

    res.json({ code: 0, message: '回调处理成功' });
  } catch (e) {
    console.error('[orders] 支付回调处理失败:', e.message);
    res.status(500).json({ code: 500, message: '处理失败' });
  }
});

// 查询我的订单列表
router.get('/', authRequired, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM orders WHERE user_id = ?';
  let params = [req.user.id];
  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const orders = db.prepare(sql).all(...params);

  let countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
  let countParams = [req.user.id];
  if (status && status !== 'all') {
    countSql += ' AND status = ?';
    countParams.push(status);
  }
  const { total } = db.prepare(countSql).get(...countParams);

  res.json({
    code: 0,
    data: {
      list: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// 查询订单详情
router.get('/:id', authRequired, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在', data: null });
  }
  let snapshot = {};
  try { snapshot = JSON.parse(order.item_snapshot || '{}'); } catch {}
  res.json({ code: 0, data: { ...order, parsed_snapshot: snapshot } });
});

// 退订/取消订单（支持龙虾平台真实退订）
router.post('/:id/refund', authRequired, [
  body('reason').optional().isLength({ max: 200 }),
], async (req, res) => {
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在', data: null });
  }
  if (order.status !== 'paid') {
    return res.status(400).json({ code: 400, message: `订单状态为${order.status}，无法退订`, data: null });
  }

  const { reason } = req.body;
  let platformRefundResult = null;

  if (order.platform_order_no) {
    try {
      let apiPath = '';
      if (order.item_type === 'flight') {
        apiPath = '/open/v1/flight/order/refund';
      } else if (order.item_type === 'hotel') {
        apiPath = '/open/v1/hotel/order/refund';
      } else if (order.item_type === 'taxi') {
        apiPath = '/open/v1/taxi/order/cancel';
      } else if (order.item_type === 'train') {
        apiPath = '/open/v1/train/order/refund';
      } else if (order.item_type === 'bus') {
        apiPath = '/open/v1/bus/order/refund';
      }

      if (apiPath) {
        platformRefundResult = await callLongxiaApi(apiPath, 'POST', {
          order_no: order.platform_order_no,
          out_trade_no: order.order_no,
          reason: reason || '用户主动退订',
        });
        console.log(`[orders] 龙虾平台退订结果: ${JSON.stringify(platformRefundResult)}`);
      }
    } catch (e) {
      console.error('[orders] 调用龙虾平台退订异常:', e.message);
    }
  }

  db.prepare(`
    UPDATE orders SET status = 'refunded', refund_reason = ?, refunded_at = datetime('now','localtime'),
      updated_at = datetime('now','localtime') WHERE id = ?
  `).run(reason || '用户主动退订', orderId);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  
  if (platformRefundResult && platformRefundResult.code === 0) {
    res.json({ code: 0, data: updated, message: '退订成功' });
  } else {
    res.json({ 
      code: 0, 
      data: updated, 
      message: order.platform_order_no ? '本地订单已退订，龙虾平台退订结果请稍后查询' : '退订成功'
    });
  }
});

// 取消待支付订单（支持龙虾平台真实取消）
router.post('/:id/cancel', authRequired, async (req, res) => {
  const orderId = req.params.id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在', data: null });
  }
  if (order.status !== 'pending') {
    return res.status(400).json({ code: 400, message: `订单状态为${order.status}，无法取消`, data: null });
  }

  if (order.platform_order_no) {
    try {
      let apiPath = '';
      if (order.item_type === 'flight') {
        apiPath = '/open/v1/flight/order/cancel';
      } else if (order.item_type === 'hotel') {
        apiPath = '/open/v1/hotel/order/cancel';
      } else if (order.item_type === 'taxi') {
        apiPath = '/open/v1/taxi/order/cancel';
      } else if (order.item_type === 'train') {
        apiPath = '/open/v1/train/order/cancel';
      } else if (order.item_type === 'bus') {
        apiPath = '/open/v1/bus/order/cancel';
      }

      if (apiPath) {
        const result = await callLongxiaApi(apiPath, 'POST', {
          order_no: order.platform_order_no,
          out_trade_no: order.order_no,
        });
        console.log(`[orders] 龙虾平台取消订单结果: ${JSON.stringify(result)}`);
      }
    } catch (e) {
      console.error('[orders] 调用龙虾平台取消订单异常:', e.message);
    }
  }

  db.prepare(`
    UPDATE orders SET status = 'cancelled', updated_at = datetime('now','localtime') WHERE id = ?
  `).run(orderId);

  res.json({ code: 0, message: '订单已取消' });
});

module.exports = router;
