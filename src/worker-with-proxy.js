/**
 * Cloudflare Workers 完整版 - 包含龙虾API代理
 */

import { AutoRouter, error, json, withParams } from 'itty-router';

// 创建路由器
const router = AutoRouter();

// CORS 中间件
const withCors = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};

// OPTIONS 预检请求处理
router.options('*', () => new Response(null, { status: 204 }));

// ==================== 龙虾API代理 ====================

const LONGXIA_API_HOST = 'api.longxiachuxing.com';

// 代理 GET 请求
async function proxyGet(apiPath, params, token) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const fullPath = qs ? `${apiPath}?${qs}` : apiPath;
  const url = `https://${LONGXIA_API_HOST}${fullPath}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ code: -1, message: '代理请求失败: ' + err.message, data: null }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 代理 POST 请求
async function proxyPost(apiPath, body, token) {
  const url = `https://${LONGXIA_API_HOST}${apiPath}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ code: -1, message: '代理请求失败: ' + err.message, data: null }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 逆地理编码
router.get('/api/reverse-geocode', async (request, env) => {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');

  const response = await proxyGet('/open/v1/geo/reverse', {
    location,
    extensions: 'all'
  }, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// POI 搜索
router.get('/api/poi-search', async (request, env) => {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('keywords');
  const city = searchParams.get('city');
  const offset = searchParams.get('offset') || '10';

  const params = { keywords, offset, page: 1, extensions: 'all' };
  if (city) {
    params.city = city;
    params.citylimit = 'true';
  }

  const response = await proxyGet('/open/v1/geo/places/search', params, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 附近搜索
router.get('/api/nearby-search', async (request, env) => {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const keywords = searchParams.get('keywords');
  const radius = searchParams.get('radius') || '3000';
  const offset = searchParams.get('offset') || '10';

  const params = { location, radius, offset, page: 1, extensions: 'all' };
  if (keywords) params.keywords = keywords;

  const response = await proxyGet('/open/v1/geo/places/nearby', params, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 城市机场查询
router.get('/api/city-airport', async (request, env) => {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  const response = await proxyGet('/open/v1/flight/city_airport', { city }, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 机票搜索
router.post('/api/flight-search', async (request, env) => {
  const body = await request.json();

  const requestBody = {
    trip_mode: 'domestic',
    trip_type: 'oneway',
    from_code: body.from_code || body.origin,
    to_code: body.to_code || body.destination,
    depart_date: body.depart_date || body.date,
    passengers: {
      adult: body.adult || 1,
      child: 0,
      infant: 0
    },
    cabin_class: body.cabin_class || 'economy',
    page_size: body.page_size || 20,
    sort_by: body.sort_by || 'price',
  };

  const response = await proxyPost('/open/v1/flight/search', requestBody, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 机票报价接口
router.post('/api/flight-pricing', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { search_offer_id, passengers } = body;

    if (!search_offer_id || !passengers) {
      return json({ code: 400, message: '缺少必要参数', data: null }, { status: 400 });
    }

    const response = await proxyPost('/open/v1/flight/pricing', {
      search_offer_id,
      passengers
    }, env.LONGXIA_TOKEN);

    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return json({ code: 500, message: '报价失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 查询龙虾订单详情
router.get('/api/flight-order/:system_no', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const { system_no } = request.params;

    const response = await proxyPost('/open/v1/flight/order/detail', {
      system_no
    }, env.LONGXIA_TOKEN);

    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return json({ code: 500, message: '查询订单失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 火车搜索
router.post('/api/train-search', async (request, env) => {
  const body = await request.json();

  const requestBody = {
    dep_date: body.dep_date,
    from_station: body.from_station,
    to_station: body.to_station,
    sort_by: 'price',
    page_size: 10,
    page: 1,
  };

  const response = await proxyPost('/open/v1/train/search', requestBody, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 出租车预估
router.post('/api/taxi-estimate', async (request, env) => {
  const body = await request.json();
  const response = await proxyPost('/open/v1/taxi/estimate', body, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 酒店搜索
router.post('/api/hotel-search', async (request, env) => {
  const body = await request.json();

  const requestBody = {
    destination: body.destination,
    check_in: body.check_in,
    check_out: body.check_out,
    sort_by: body.sort_by || 'price',
    page_size: body.page_size || 50,
    page: body.page || 1,
    adult_count: 1,
    room_count: 1,
  };

  if (body.latitude && body.longitude) {
    requestBody.latitude = body.latitude;
    requestBody.longitude = body.longitude;
  }
  if (body.adcode) requestBody.adcode = body.adcode;
  if (body.radius) requestBody.radius = body.radius;

  const response = await proxyPost('/open/v1/hotel/search', requestBody, env.LONGXIA_TOKEN);

  return new Response(response.body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 酒店房型详情（获取产品级 offer_id）
router.post('/api/hotel-rooms', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { search_offer_id } = body;

    if (!search_offer_id) {
      return json({ code: 400, message: '缺少 search_offer_id 参数', data: null }, { status: 400 });
    }

    console.log('[房型查询] search_offer_id:', search_offer_id);

    // 调用龙虾酒店房型接口
    const response = await proxyPost('/open/v1/hotel/rooms', {
      search_offer_id
    }, env.LONGXIA_TOKEN);

    const responseText = await response.text();

    // 记录响应
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        if (data.code === 0 && data.data && data.data.room_types && data.data.room_types.length > 0) {
          const firstProduct = data.data.room_types[0].products?.[0];
          if (firstProduct) {
            console.log('[房型查询] 成功，第一个产品 offer_id:', firstProduct.offer_id?.substring(0, 30) + '...');
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    } else {
      console.error('[房型查询] 失败，状态:', response.status);
    }

    return new Response(responseText, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return json({ code: 500, message: '获取酒店房型失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 创建酒店订单
router.post('/api/hotel-order-create', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { offer_id, out_trade_no, contact, guests, hotel_id } = body;

    // 验证必填字段
    if (!offer_id || !out_trade_no) {
      return json({ code: 400, message: '缺少 offer_id 或 out_trade_no', data: null }, { status: 400 });
    }

    if (!contact || !contact.name || !contact.phone) {
      return json({ code: 400, message: '联系人姓名和手机号为必填项', data: null }, { status: 400 });
    }

    if (!guests || guests.length === 0 || !guests[0].name) {
      return json({ code: 400, message: '请填写入住人信息', data: null }, { status: 400 });
    }

    // 构建请求体
    const requestBody = {
      offer_id: offer_id,
      out_trade_no: out_trade_no,
      contact: {
        name: contact.name,
        phone: contact.phone,
        email: contact.email || ''
      },
      guests: guests.map(g => ({
        name: g.name,
        id_number: g.id_number || '',
        id_type: g.id_type || 'ID_CARD'
      })),
      pay_mode: 'user_pay'
    };

    // ========== 如果 offer_id 是 search_offer_id，先获取产品级 offer_id ==========
    let finalOfferId = offer_id;

    // 检测是否是 search_offer_id (通常以 hs_ 开头且较短)
    if (offer_id && (offer_id.startsWith('hs_') || offer_id.length < 50)) {
      console.log('特价酒店：检测到 search_offer_id，调用房型详情接口获取产品级 offer_id...');
      console.log('原 search_offer_id:', offer_id);

      try {
        // 使用正确的房型详情接口
        const roomsRes = await fetch('https://api.longxiachuxing.com/open/v1/hotel/rooms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            search_offer_id: offer_id
          })
        });

        console.log('房型详情接口HTTP状态:', roomsRes.status);

        if (!roomsRes.ok) {
          const errorText = await roomsRes.text();
          console.error('房型详情接口错误内容:', errorText);

          // 尝试解析错误响应
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { code: roomsRes.status, message: errorText };
          }

          console.error('房型详情接口错误:', errorData);

          // 根据错误码返回友好提示
          if (errorData.code === 40005) {
            // 房型已售罄
            return json({
              code: 40005,
              message: '抱歉，该酒店房间已被预订完，请选择其他酒店',
              data: {
                error: errorData.message,
                suggestion: '建议：1) 选择其他酒店 2) 更改入住日期',
                request_id: errorData.request_id
              }
            }, { status: 400 });
          }

          if (errorData.code === 40002 || errorData.code === 40003) {
            // offer_id 已过期
            return json({
              code: errorData.code,
              message: '酒店预订链接已过期，请重新搜索',
              data: {
                error: errorData.message,
                suggestion: '建议：重新搜索酒店后在10分钟内完成预订',
                request_id: errorData.request_id
              }
            }, { status: 400 });
          }

          // 其他错误，直接返回，不再尝试兜底
          return json({
            code: errorData.code || 500,
            message: errorData.message || '查询房型失败，请稍后重试',
            data: {
              error: errorData.message,
              suggestion: '建议：稍后重试或选择其他酒店',
              request_id: errorData.request_id
            }
          }, { status: 400 });
        }

        const roomsData = await roomsRes.json();
        console.log('房型详情接口响应:', JSON.stringify(roomsData, null, 2));

        if (roomsData.code === 0 && roomsData.data) {
          // 从 room_types 中找到产品级 offer_id
          const roomTypes = roomsData.data.room_types || [];

          if (roomTypes.length === 0) {
            console.error('房型详情接口未返回房型信息');
            return json({
              code: 400,
              message: '该酒店暂无可预订房型',
              data: {
                suggestion: '建议：选择其他酒店或更改入住日期'
              }
            }, { status: 400 });
          }

          // 选择第一个房型的第一个产品（通常是最便宜的）
          let foundOfferId = null;

          for (const roomType of roomTypes) {
            const products = roomType.products || [];
            if (products.length > 0) {
              // 找到第一个有 offer_id 的产品
              const product = products.find(p => p.offer_id);
              if (product) {
                foundOfferId = product.offer_id;
                console.log('找到产品级 offer_id，房型:', roomType.room_name, '产品:', product.product_name, '价格:', product.price);
                break;
              }
            }
          }

          if (foundOfferId) {
            finalOfferId = foundOfferId;
            console.log('成功获取产品级 offer_id:', finalOfferId.substring(0, 50) + '...');
          } else {
            console.error('房型详情接口未返回任何产品 offer_id');
            return json({
              code: 400,
              message: '该酒店暂无可预订房型',
              data: {
                suggestion: '建议：选择其他酒店或更改入住日期'
              }
            }, { status: 400 });
          }
        } else {
          // 详情接口业务逻辑失败
          console.error('获取产品级 offer_id 失败:', roomsData);

          let errorMessage = '查询房型失败，请重新搜索酒店';
          if (roomsData.code === 50001 || roomsData.code === 40002) {
            errorMessage = 'offer_id 已过期或已失效，请重新搜索酒店';
          } else if (roomsData.message) {
            errorMessage = roomsData.message;
          }

          return json({
            code: roomsData.code || 500,
            message: errorMessage,
            data: {
              error: roomsData.message,
              suggestion: '建议：1) 重新搜索酒店 2) 搜索后尽快预订（10分钟内）',
              request_id: roomsData.request_id
            }
          }, { status: 400 });
        }
      } catch (err) {
        console.error('调用房型详情接口失败:', err);
        console.error('错误详情:', err.message, err.stack);

        // 网络错误或其他异常，返回友好提示，不再尝试下单
        return json({
          code: 500,
          message: '查询房型失败，请稍后重试',
          data: {
            error: err.message,
            suggestion: '建议：稍后重试或联系客服'
          }
        }, { status: 500 });
      }
    }

    // 更新请求体使用实时 offer_id
    requestBody.offer_id = finalOfferId;

    console.log('创建酒店订单请求:', JSON.stringify(requestBody, null, 2));

    // 调用龙虾酒店订单创建接口
    const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/hotel/order/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const longxiaData = await longxiaRes.json();
    console.log('龙虾酒店订单响应:', JSON.stringify(longxiaData, null, 2));

    if (longxiaData.code === 0) {
      const hotelOrder = longxiaData.data;

      // 可选：保存到数据库
      try {
        const orderNo = out_trade_no;
        await env.DB.prepare(`
          INSERT INTO orders (
            order_no, user_id, item_type, item_name,
            total_amount, status, longxia_order_no, pay_url,
            contact_name, contact_phone
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          orderNo,
          decoded.id,
          'hotel',
          hotelOrder.hotel_name || '酒店预订',
          hotelOrder.total_amount || 0,
          'pending',
          hotelOrder.order_no || '',
          hotelOrder.checkout_url || '',
          contact.name,
          contact.phone
        ).run();
      } catch (dbErr) {
        console.error('保存酒店订单到数据库失败:', dbErr);
        // 继续返回，数据库保存失败不影响订单创建
      }

      return json({
        code: 0,
        message: '酒店订单创建成功',
        data: {
          order_no: hotelOrder.order_no,
          checkout_url: hotelOrder.checkout_url,
          pay_url: hotelOrder.checkout_url,
          hotel_name: hotelOrder.hotel_name,
          check_in: hotelOrder.check_in,
          check_out: hotelOrder.check_out,
          total_amount: hotelOrder.total_amount
        }
      });
    } else {
      // 返回龙虾 API 的错误信息
      console.error('龙虾酒店预订失败:', longxiaData);

      let errorMessage = longxiaData.message || '创建酒店订单失败';
      let suggestion = '';

      if (longxiaData.code === 50001) {
        errorMessage = '酒店预订失败';
        suggestion = '可能原因：1) offer_id 已过期 2) 房间已售罄 3) 价格已变动。建议重新搜索酒店。';
      }

      return json({
        code: longxiaData.code || 500,
        message: errorMessage,
        data: {
          error: longxiaData.message,
          suggestion: suggestion,
          request_id: longxiaData.request_id,
          details: longxiaData.data || null
        }
      }, { status: 400 });
    }
  } catch (err) {
    console.error('创建酒店订单失败:', err);
    return json({
      code: 500,
      message: '创建酒店订单失败，请稍后重试',
      data: {
        error: err.message
      }
    }, { status: 500 });
  }
});

// 特价机票（模拟数据）
router.get('/api/deal-flights', async (request, env) => {
  const mockFlights = [
    { route: '深圳 → 北京', from_code: 'SZX', to_code: 'PEK', flight_no: 'CA1234', dep_time: '08:00', arr_time: '11:30', price: 680, depart_date: '2026-08-10', offer_id: 'mock_001', cabin_name: '经济舱' },
    { route: '深圳 → 上海', from_code: 'SZX', to_code: 'PVG', flight_no: 'MU5678', dep_time: '09:00', arr_time: '11:45', price: 520, depart_date: '2026-08-10', offer_id: 'mock_002', cabin_name: '经济舱' },
    { route: '广州 → 成都', from_code: 'CAN', to_code: 'CTU', flight_no: 'CA8901', dep_time: '10:30', arr_time: '13:00', price: 450, depart_date: '2026-08-10', offer_id: 'mock_003', cabin_name: '经济舱' },
    { route: '上海 → 重庆', from_code: 'PVG', to_code: 'CKG', flight_no: 'HU2345', dep_time: '14:00', arr_time: '17:00', price: 580, depart_date: '2026-08-10', offer_id: 'mock_004', cabin_name: '经济舱' },
    { route: '北京 → 杭州', from_code: 'PEK', to_code: 'HGH', flight_no: 'CA6789', dep_time: '11:00', arr_time: '13:30', price: 490, depart_date: '2026-08-10', offer_id: 'mock_005', cabin_name: '经济舱' },
  ];
  return json({ code: 0, message: 'success', data: mockFlights });
});

// 特价酒店（模拟数据）
router.get('/api/deal-hotels', async (request, env) => {
  const mockHotels = [
    { name: '深圳湾假日酒店', rating: 4.5, price: 288, dist: '距中心2.3km', city: '深圳', check_in: '2026-08-10', check_out: '2026-08-11', offer_id: 'hotel_001', main_picture: '', address: '南山区深圳湾' },
    { name: '上海外滩美居酒店', rating: 4.3, price: 368, dist: '距中心1.5km', city: '上海', check_in: '2026-08-10', check_out: '2026-08-11', offer_id: 'hotel_002', main_picture: '', address: '黄浦区外滩' },
    { name: '北京三里屯智选酒店', rating: 4.2, price: 299, dist: '距中心3.2km', city: '北京', check_in: '2026-08-10', check_out: '2026-08-11', offer_id: 'hotel_003', main_picture: '', address: '朝阳区三里屯' },
    { name: '成都春熙路亚朵酒店', rating: 4.4, price: 258, dist: '距中心0.8km', city: '成都', check_in: '2026-08-10', check_out: '2026-08-11', offer_id: 'hotel_004', main_picture: '', address: '锦江区春熙路' },
    { name: '杭州西湖如家酒店', rating: 4.1, price: 218, dist: '距中心1.2km', city: '杭州', check_in: '2026-08-10', check_out: '2026-08-11', offer_id: 'hotel_005', main_picture: '', address: '西湖区西湖' },
  ];
  return json({ code: 0, message: 'success', data: mockHotels });
});

// ==================== 基础接口 ====================

// 根路径
router.get('/', () => {
  return new Response(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>演唱会行程生成器 API</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #7C3AED; }
      </style>
    </head>
    <body>
      <h1>🎵 演唱会行程生成器 API</h1>
      <p>✅ API 正在运行中</p>
      <p>包含龙虾出行API代理</p>
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
    data: { status: 'healthy', timestamp: new Date().toISOString() }
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

// 注册
router.post('/api/auth/register', async (request, env) => {
  try {
    const body = await request.json();
    const { username, email, password, nickname } = body;

    // 验证必填字段
    if (!username || !email || !password) {
      return json({ code: 400, message: '请填写完整信息', data: null }, { status: 400 });
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 20) {
      return json({ code: 400, message: '用户名长度应为3-20个字符', data: null }, { status: 400 });
    }

    // 验证密码长度
    if (password.length < 6) {
      return json({ code: 400, message: '密码至少6位', data: null }, { status: 400 });
    }

    // 检查用户名是否已存在
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();

    if (existingUser) {
      return json({ code: 400, message: '用户名已存在', data: null }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingEmail = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingEmail) {
      return json({ code: 400, message: '邮箱已被注册', data: null }, { status: 400 });
    }

    // 先测试 token 生成（避免插入数据库后 token 生成失败导致脏数据）
    // 使用临时 ID 测试
    const encoder = new TextEncoder();
    const testTokenData = JSON.stringify({ id: 0, username: username, role: 'user' });
    const testBytes = encoder.encode(testTokenData);
    try {
      // 测试是否能成功编码
      btoa(String.fromCharCode(...testBytes));
    } catch (encodeErr) {
      return json({ code: 400, message: '用户名包含不支持的字符', data: null }, { status: 400 });
    }

    // 插入新用户（密码应该加密，这里简化处理）
    const result = await env.DB.prepare(
      'INSERT INTO users (username, email, password_hash, nickname, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(username, email, password, nickname || username, 'user').run();

    const userId = result.meta.last_row_id;

    // 生成真正的 token
    const tokenData = JSON.stringify({ id: userId, username: username, role: 'user' });
    const bytes = encoder.encode(tokenData);
    const token = btoa(String.fromCharCode(...bytes));

    return json({
      code: 0,
      message: '注册成功',
      data: {
        token,
        user: {
          id: userId,
          username: username,
          email: email,
          nickname: nickname || username,
          role: 'user'
        }
      }
    });
  } catch (err) {
    return json({ code: 500, message: '注册失败: ' + err.message, data: null }, { status: 500 });
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

    // 验证密码
    if (user.password_hash !== password) {
      return json({ code: 400, message: '账号或密码错误', data: null }, { status: 400 });
    }

    // 生成 token - 使用 TextEncoder 处理中文
    const encoder = new TextEncoder();
    const tokenData = JSON.stringify({ id: user.id, username: user.username, role: user.role });
    const bytes = encoder.encode(tokenData);
    const token = btoa(String.fromCharCode(...bytes));

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
    return json({ code: 500, message: '登录失败', data: null }, { status: 500 });
  }
});

// 获取当前用户信息
router.get('/api/auth/me', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    // 从数据库获取最新用户信息
    const user = await env.DB.prepare(
      'SELECT id, username, email, nickname, role, avatar_url, created_at FROM users WHERE id = ?'
    ).bind(decoded.id).first();

    if (!user) {
      return json({ code: 401, message: '用户不存在', data: null }, { status: 401 });
    }

    return json({
      code: 0,
      message: 'success',
      data: user
    });
  } catch (err) {
    return json({ code: 500, message: '获取用户信息失败', data: null }, { status: 500 });
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
        list: result.results || [],
        pagination: { page: 1, limit: 20, total: result.results?.length || 0 },
        total: result.results?.length || 0,
        limit: 20
      }
    });
  } catch (err) {
    return json({ code: 500, message: '获取演唱会列表失败', data: null }, { status: 500 });
  }
});

// 热门演唱会（前端需要这个接口）
router.get('/api/hot-concerts', async (request, env) => {
  try {
    // 获取用户ID（如果已登录）
    let userId = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId;
      } catch {}
    }

    const result = await env.DB.prepare(
      'SELECT * FROM concerts WHERE status = ? ORDER BY concert_date ASC LIMIT 10'
    ).bind('selling').all();

    let concerts = result.results || [];

    // 如果用户已登录，查询收藏状态
    if (userId && concerts.length > 0) {
      const concertIds = concerts.map(c => c.id).join(',');
      const favorites = await env.DB.prepare(
        `SELECT concert_id FROM favorites WHERE user_id = ? AND concert_id IN (${concertIds})`
      ).bind(userId).all();

      const favSet = new Set(favorites.results.map(f => f.concert_id));
      concerts = concerts.map(c => ({
        ...c,
        is_favorited: favSet.has(c.id)
      }));
    }

    return json({
      code: 0,
      message: 'success',
      data: concerts
    });
  } catch (err) {
    return json({ code: 500, message: '获取热门演唱会失败', data: [] }, { status: 500 });
  }
});

// 添加收藏
router.post('/api/favorites', async (request, env) => {
  try {
    console.log('[Favorites] POST /api/favorites called');

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Favorites] No auth header');
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      console.log('[Favorites] Token decode failed');
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const userId = decoded.id;
    console.log('[Favorites] userId:', userId);

    const body = await request.json();
    const { concert_id } = body;
    console.log('[Favorites] concert_id:', concert_id, 'type:', typeof concert_id);

    if (!concert_id) {
      console.log('[Favorites] Missing concert_id');
      return json({ code: 400, message: '缺少演唱会ID', data: null }, { status: 400 });
    }

    // 检查是否已收藏
    const existing = await env.DB.prepare(
      'SELECT id FROM favorites WHERE user_id = ? AND concert_id = ?'
    ).bind(userId, concert_id).first();
    console.log('[Favorites] existing:', existing);

    if (existing) {
      console.log('[Favorites] Already favorited');
      return json({ code: 0, message: '已收藏', data: null });
    }

    // 添加收藏
    console.log('[Favorites] Inserting into DB...');
    const result = await env.DB.prepare(
      'INSERT INTO favorites (user_id, concert_id) VALUES (?, ?)'
    ).bind(userId, concert_id).run();
    console.log('[Favorites] Insert result:', result);

    return json({ code: 0, message: '收藏成功', data: null });
  } catch (err) {
    console.error('[Favorites] Error:', err);
    return json({ code: 500, message: '收藏失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 取消收藏
router.delete('/api/favorites/:concert_id', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const userId = decoded.id;
    const concert_id = request.params.concert_id;

    await env.DB.prepare(
      'DELETE FROM favorites WHERE user_id = ? AND concert_id = ?'
    ).bind(userId, concert_id).run();

    return json({ code: 0, message: '取消收藏成功', data: null });
  } catch (err) {
    return json({ code: 500, message: '取消收藏失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 获取我的收藏列表
router.get('/api/favorites', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const userId = decoded.id;

    const result = await env.DB.prepare(`
      SELECT c.*, f.created_at as favorited_at
      FROM favorites f
      JOIN concerts c ON f.concert_id = c.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).bind(userId).all();

    return json({
      code: 0,
      message: 'success',
      data: result.results || []
    });
  } catch (err) {
    return json({ code: 500, message: '获取收藏列表失败', data: [] }, { status: 500 });
  }
});

// 获取单个演唱会详情
router.get('/api/concerts/:id', async (request, env) => {
  try {
    const id = request.params.id;
    const concert = await env.DB.prepare(
      'SELECT * FROM concerts WHERE id = ?'
    ).bind(id).first();

    if (!concert) {
      return json({ code: 404, message: '演唱会不存在', data: null }, { status: 404 });
    }

    return json({ code: 0, message: 'success', data: concert });
  } catch (err) {
    return json({ code: 500, message: '获取演唱会详情失败', data: null }, { status: 500 });
  }
});

// 添加演唱会（需要管理员权限）
router.post('/api/concerts', async (request, env) => {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return json({ code: 403, message: '权限不足，仅管理员可操作', data: null }, { status: 403 });
    }

    // 获取请求数据
    const body = await request.json();
    const { artist, tour_name, city, venue, concert_date, start_time, status, tag } = body;

    // 验证必填字段
    if (!artist || !city || !concert_date) {
      return json({ code: 400, message: '请填写必填项（艺人、城市、日期）', data: null }, { status: 400 });
    }

    // 插入数据库
    const result = await env.DB.prepare(
      'INSERT INTO concerts (artist, tour_name, city, venue, concert_date, start_time, status, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      artist,
      tour_name || '',
      city,
      venue || '',
      concert_date,
      start_time || '19:00',
      status || 'selling',
      tag || ''
    ).run();

    return json({
      code: 0,
      message: '添加成功',
      data: { id: result.meta.last_row_id }
    });
  } catch (err) {
    return json({ code: 500, message: '添加失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 更新演唱会（需要管理员权限）
router.put('/api/concerts/:id', async (request, env) => {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return json({ code: 403, message: '权限不足，仅管理员可操作', data: null }, { status: 403 });
    }

    const id = request.params.id;
    const body = await request.json();
    const { artist, tour_name, city, venue, concert_date, start_time, status, tag } = body;

    // 验证必填字段
    if (!artist || !city || !concert_date) {
      return json({ code: 400, message: '请填写必填项（艺人、城市、日期）', data: null }, { status: 400 });
    }

    // 检查演唱会是否存在
    const existing = await env.DB.prepare('SELECT id FROM concerts WHERE id = ?').bind(id).first();
    if (!existing) {
      return json({ code: 404, message: '演唱会不存在', data: null }, { status: 404 });
    }

    // 更新数据库
    await env.DB.prepare(
      'UPDATE concerts SET artist=?, tour_name=?, city=?, venue=?, concert_date=?, start_time=?, status=?, tag=? WHERE id=?'
    ).bind(
      artist,
      tour_name || '',
      city,
      venue || '',
      concert_date,
      start_time || '19:00',
      status || 'selling',
      tag || '',
      id
    ).run();

    return json({ code: 0, message: '更新成功', data: null });
  } catch (err) {
    return json({ code: 500, message: '更新失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 删除演唱会（需要管理员权限）
router.delete('/api/concerts/:id', async (request, env) => {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      return json({ code: 403, message: '权限不足，仅管理员可操作', data: null }, { status: 403 });
    }

    const id = request.params.id;

    // 检查演唱会是否存在
    const existing = await env.DB.prepare('SELECT id FROM concerts WHERE id = ?').bind(id).first();
    if (!existing) {
      return json({ code: 404, message: '演唱会不存在', data: null }, { status: 404 });
    }

    // 删除数据库记录
    await env.DB.prepare('DELETE FROM concerts WHERE id = ?').bind(id).run();

    return json({ code: 0, message: '删除成功', data: null });
  } catch (err) {
    return json({ code: 500, message: '删除失败: ' + err.message, data: null }, { status: 500 });
  }
});

// ==================== 留言板接口 ====================

// 获取留言列表
router.get('/api/messages', async (request, env) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const artist = url.searchParams.get('artist') || '';

    // 获取当前用户（如果已登录）
    let currentUserId = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = JSON.parse(atob(token));
        currentUserId = decoded.id;
      } catch {}
    }

    // 构建查询
    let query = `
      SELECT m.*, u.username, u.nickname, u.avatar_url,
      (SELECT COUNT(*) FROM message_likes WHERE message_id = m.id) as likes_count
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.parent_id IS NULL
    `;
    const params = [];

    if (artist) {
      query += ' AND m.artist LIKE ?';
      params.push(`%${artist}%`);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const result = await env.DB.prepare(query).bind(...params).all();

    // 为每条留言添加 is_liked 字段
    const messages = result.results || [];
    if (currentUserId) {
      for (const msg of messages) {
        const liked = await env.DB.prepare(
          'SELECT 1 FROM message_likes WHERE message_id = ? AND user_id = ?'
        ).bind(msg.id, currentUserId).first();
        msg.is_liked = !!liked;

        // 获取回复
        const replies = await env.DB.prepare(`
          SELECT m.*, u.username, u.nickname, u.avatar_url
          FROM messages m
          LEFT JOIN users u ON m.user_id = u.id
          WHERE m.parent_id = ?
          ORDER BY m.created_at ASC
        `).bind(msg.id).all();
        msg.replies = replies.results || [];
      }
    } else {
      for (const msg of messages) {
        msg.is_liked = false;
        // 获取回复
        const replies = await env.DB.prepare(`
          SELECT m.*, u.username, u.nickname, u.avatar_url
          FROM messages m
          LEFT JOIN users u ON m.user_id = u.id
          WHERE m.parent_id = ?
          ORDER BY m.created_at ASC
        `).bind(msg.id).all();
        msg.replies = replies.results || [];
      }
    }

    return json({
      code: 0,
      message: 'success',
      data: {
        list: messages,
        total: messages.length,
        page,
        limit
      }
    });
  } catch (err) {
    return json({ code: 500, message: '获取留言失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 发布留言
router.post('/api/messages', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { content, sticker, parent_id, artist, tag } = body;

    if (!content || content.trim().length === 0) {
      return json({ code: 400, message: '留言内容不能为空', data: null }, { status: 400 });
    }

    // 插入留言
    const result = await env.DB.prepare(`
      INSERT INTO messages (user_id, parent_id, content, sticker, artist, tag)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      decoded.id,
      parent_id || null,
      content.trim(),
      sticker || '',
      artist || '',
      tag || ''
    ).run();

    return json({
      code: 0,
      message: '发布成功',
      data: { id: result.meta.last_row_id }
    });
  } catch (err) {
    return json({ code: 500, message: '发布失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 点赞留言
router.post('/api/messages/:id/like', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const messageId = request.params.id;

    // 检查是否已点赞
    const existing = await env.DB.prepare(
      'SELECT 1 FROM message_likes WHERE message_id = ? AND user_id = ?'
    ).bind(messageId, decoded.id).first();

    if (existing) {
      return json({ code: 400, message: '已经点赞过了', data: null }, { status: 400 });
    }

    // 插入点赞记录
    await env.DB.prepare(
      'INSERT INTO message_likes (message_id, user_id) VALUES (?, ?)'
    ).bind(messageId, decoded.id).run();

    return json({ code: 0, message: '点赞成功', data: null });
  } catch (err) {
    return json({ code: 500, message: '点赞失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 取消点赞
router.delete('/api/messages/:id/like', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const messageId = request.params.id;

    // 删除点赞记录
    await env.DB.prepare(
      'DELETE FROM message_likes WHERE message_id = ? AND user_id = ?'
    ).bind(messageId, decoded.id).run();

    return json({ code: 0, message: '取消点赞成功', data: null });
  } catch (err) {
    return json({ code: 500, message: '取消点赞失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 删除留言
router.delete('/api/messages/:id', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const messageId = request.params.id;

    // 检查留言是否存在
    const message = await env.DB.prepare(
      'SELECT user_id FROM messages WHERE id = ?'
    ).bind(messageId).first();

    if (!message) {
      return json({ code: 404, message: '留言不存在', data: null }, { status: 404 });
    }

    // 只能删除自己的留言或管理员可以删除任何留言
    if (message.user_id !== decoded.id && decoded.role !== 'admin') {
      return json({ code: 403, message: '无权删除此留言', data: null }, { status: 403 });
    }

    // 删除留言（级联删除点赞和回复）
    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();

    return json({ code: 0, message: '删除成功', data: null });
  } catch (err) {
    return json({ code: 500, message: '删除失败: ' + err.message, data: null }, { status: 500 });
  }
});

// ==================== 订单和支付接口 ====================

// 生成订单号
function generateOrderNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${random}`;
}

// 创建订单
router.post('/api/orders', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const {
      itinerary_id,
      item_type,
      item_id,
      item_name,
      item_detail,
      quantity,
      unit_price,
      travel_date,
      contact_name,
      contact_phone,
      contact_email,
      // 机票相关字段
      offer_id,
      search_offer_id,
      passengers,
      contact,
      flight_no,
      departure_time,
      arrival_time,
      // 酒店相关字段
      guests
    } = body;

    // ========== 如果是机票订单，调用龙虾预订接口 ==========
    if (item_type === 'flight' && offer_id) {
      try {
        console.log('=== 机票订单创建开始 ===');
        console.log('收到的原始数据:', JSON.stringify(body, null, 2));

        const orderNo = generateOrderNo();

        // 确保 contact 对象格式正确
        const contactData = {
          name: contact?.name || contact_name || passengers[0]?.name || '',
          phone: contact?.phone || contact_phone || passengers[0]?.phone || '',
          email: contact?.email || contact_email || body.contact_email || ''
        };

        // 验证必填字段
        if (!contactData.name || !contactData.phone) {
          return json({
            code: 400,
            message: '联系人姓名和手机号为必填项',
            data: null
          }, { status: 400 });
        }

        // 验证乘客信息
        if (!passengers || passengers.length === 0) {
          return json({
            code: 400,
            message: '请填写乘客信息',
            data: null
          }, { status: 400 });
        }

        // 转换乘客信息格式为龙虾 API 要求的格式
        // 兼容多种字段名：id_number, id_card, idNumber, idCard
        const formattedPassengers = passengers.map(p => {
          // 将 id_type 转换为大写格式（龙虾要求 ID_CARD 而不是 id_card）
          let idType = (p.id_type || p.idType || 'id_card').toLowerCase();
          const idTypeMap = {
            'id_card': 'ID_CARD',
            'passport': 'PASSPORT',
            'hk_macau_pass': 'HK_MACAU_PASS',
            'tw_pass': 'TW_PASS'
          };

          const idNumber = p.id_number || p.id_card || p.idNumber || p.idCard || '';

          // 处理性别：优先使用传入值，否则从身份证号推断
          let sex;
          if (p.sex !== undefined && p.sex !== null && p.sex !== '') {
            sex = parseInt(p.sex);
          } else if (idType === 'id_card' && idNumber.length === 18) {
            // 身份证第17位：奇数=男(1)，偶数=女(0)
            sex = parseInt(idNumber.charAt(16)) % 2 === 1 ? 1 : 0;
          } else {
            sex = 1; // 默认男
          }

          // 处理生日：优先使用传入值，否则从身份证号提取
          let birthday = p.birthday || '';
          if (!birthday && idType === 'id_card' && idNumber.length === 18) {
            // 身份证第7-14位：出生年月日 YYYYMMDD
            const y = idNumber.substring(6, 10);
            const m = idNumber.substring(10, 12);
            const d = idNumber.substring(12, 14);
            birthday = `${y}-${m}-${d}`;
          }

          return {
            type: p.type || 'adult',  // adult/child/infant
            name: p.name,
            id_type: idTypeMap[idType] || 'ID_CARD',
            id_number: idNumber,
            birthday: birthday,
            phone: p.phone || p.mobile || p.phoneNumber || '',
            nationality_code: p.nationality_code || p.nationalityCode || 'CN',
            sex: sex  // 1=男, 0=女
          };
        });

        // 验证乘客必填字段（添加详细日志）
        for (let i = 0; i < formattedPassengers.length; i++) {
          const passenger = formattedPassengers[i];
          console.log(`乘客 ${i + 1} 信息:`, JSON.stringify(passenger, null, 2));

          const missingFields = [];
          if (!passenger.name) missingFields.push('姓名');
          if (!passenger.id_number) missingFields.push('证件号');
          if (!passenger.phone) missingFields.push('手机号');
          if (!passenger.birthday) missingFields.push('出生日期');
          if (passenger.sex === undefined || passenger.sex === null) missingFields.push('性别');

          if (missingFields.length > 0) {
            console.error(`乘客 ${i + 1} 缺少字段:`, missingFields);
            return json({
              code: 400,
              message: `乘客 ${i + 1} 信息不完整，缺少: ${missingFields.join('、')}`,
              data: {
                passenger_index: i,
                missing_fields: missingFields,
                received_data: passenger
              }
            }, { status: 400 });
          }
        }

        // ========== 步骤1：验价，用 search_offer_id 换取可下单的 offer_id ==========
        // offer_id 是 fs_ 开头的搜索ID，需要先验价获取真正的下单 offer_id
        let finalOfferId = offer_id;

        // 验价接口的 passengers 需要传乘客信息数组（与下单相同格式）
        const pricingBody = {
          search_offer_id: offer_id,
          passengers: formattedPassengers
        };

        console.log('龙虾验价请求:', JSON.stringify(pricingBody, null, 2));

        const pricingRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/pricing', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pricingBody)
        });

        const pricingData = await pricingRes.json();
        console.log('龙虾验价响应:', JSON.stringify(pricingData, null, 2));

        if (pricingData.code === 0 && pricingData.data) {
          // 验价成功，使用返回的 offer_id
          finalOfferId = pricingData.data.offer_id || pricingData.data.offerId || offer_id;
          console.log('验价成功，获取到 offer_id:', finalOfferId);
        } else {
          // 验价失败
          console.error('验价失败:', pricingData);
          return json({
            code: pricingData.code || 500,
            message: '航班验价失败：' + (pricingData.message || '未知错误'),
            data: {
              step: 'pricing',
              error: pricingData.message,
              request_id: pricingData.request_id
            }
          }, { status: 400 });
        }

        // ========== 步骤2：使用验价后的 offer_id 下单 ==========
        const requestBody = {
          offer_id: finalOfferId,
          out_trade_no: orderNo,
          passengers: formattedPassengers,
          contact: contactData,
          pay_mode: 'user_pay'
        };

        console.log('龙虾预订请求:', JSON.stringify(requestBody, null, 2));

        // 调用龙虾预订接口
        const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/order/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const longxiaData = await longxiaRes.json();
        console.log('龙虾预订响应:', JSON.stringify(longxiaData, null, 2));

        if (longxiaData.code === 0) {
          const longxiaOrder = longxiaData.data;

          // 保存到我们的数据库（checkout_url 存入 pay_url，支付时直接跳转龙虾收银台）
          const result = await env.DB.prepare(`
            INSERT INTO orders (
              order_no, user_id, itinerary_id, item_type, item_name,
              total_amount, status, longxia_order_no, pay_url,
              passenger_name, passenger_id_card, passenger_phone,
              contact_name, contact_phone,
              flight_no, departure_time, arrival_time,
              offer_id, search_offer_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            orderNo,
            decoded.id,
            itinerary_id || null,
            'flight',
            item_name,
            longxiaOrder.total_amount || unit_price,
            'pending',
            longxiaOrder.system_no,
            longxiaOrder.checkout_url || '',
            passengers[0]?.name || '',
            passengers[0]?.id_number || '',
            passengers[0]?.phone || '',
            contactData.name,
            contactData.phone,
            flight_no || '',
            departure_time || '',
            arrival_time || '',
            offer_id,
            search_offer_id || ''
          ).run();

          const orderId = result.meta.last_row_id;

          return json({
            code: 0,
            message: '机票订单创建成功',
            data: {
              id: orderId,
              order_no: orderNo,
              longxia_order_no: longxiaOrder.system_no,
              checkout_url: longxiaOrder.checkout_url,
              pay_url: longxiaOrder.checkout_url
            }
          });
        } else {
          // 返回龙虾 API 的详细错误信息
          console.error('龙虾预订失败:', longxiaData);

          // 特殊处理 50001 错误
          let errorMessage = longxiaData.message || '创建订单失败';
          let suggestion = '';

          if (longxiaData.code === 50001) {
            errorMessage = '机票预订失败';
            suggestion = '可能原因：1) offer_id 已过期（有效期10分钟）2) 航班已售罄 3) 价格已变动。建议重新搜索航班。';
          }

          return json({
            code: longxiaData.code || 500,
            message: errorMessage,
            data: {
              error: longxiaData.message,
              suggestion: suggestion,
              request_id: longxiaData.request_id,
              details: longxiaData.data || null
            }
          }, { status: 400 });
        }
      } catch (err) {
        console.error('创建机票订单失败:', err);
        console.error('错误堆栈:', err.stack);
        return json({
          code: 500,
          message: '创建机票订单失败，请稍后重试',
          data: {
            error: err.message,
            details: err.stack
          }
        }, { status: 500 });
      }
    }

    // ========== 如果是酒店订单，调用龙虾预订接口 ==========
    if (item_type === 'hotel' && offer_id) {
      try {
        console.log('=== 酒店订单创建开始 ===');
        console.log('收到的原始数据:', JSON.stringify(body, null, 2));

        const orderNo = generateOrderNo();

        // 确保 contact 对象格式正确
        const contactData = {
          name: contact?.name || contact_name || guests?.[0]?.name || '',
          phone: contact?.phone || contact_phone || guests?.[0]?.phone || '',
          email: contact?.email || contact_email || body.contact_email || ''
        };

        // 验证必填字段
        if (!contactData.name || !contactData.phone) {
          return json({
            code: 400,
            message: '联系人姓名和手机号为必填项',
            data: null
          }, { status: 400 });
        }

        // 验证入住人信息
        if (!guests || guests.length === 0) {
          return json({
            code: 400,
            message: '请填写入住人信息',
            data: null
          }, { status: 400 });
        }

        // 格式化入住人信息
        const formattedGuests = guests.map(g => {
          const guest = { name: g.name };
          if (g.id_number) {
            guest.id_number = g.id_number;
            guest.id_type = g.id_type || 'ID_CARD';
          }
          return guest;
        });

        // ========== 如果 offer_id 是 search_offer_id，先获取产品级 offer_id ==========
        let finalOfferId = offer_id;

        // 检测是否是 search_offer_id (以 hs_ 开头)
        // 产品级 offer_id 以 ho_ 开头，不需要转换
        if (offer_id && offer_id.startsWith('hs_')) {
          console.log('检测到 search_offer_id，调用房型详情接口获取产品级 offer_id...');
          console.log('原 search_offer_id:', offer_id);

          try {
            // 使用正确的房型详情接口
            const roomsRes = await fetch('https://api.longxiachuxing.com/open/v1/hotel/rooms', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                search_offer_id: offer_id
              })
            });

            console.log('房型详情接口HTTP状态:', roomsRes.status);

            if (!roomsRes.ok) {
              const errorText = await roomsRes.text();
              console.error('房型详情接口错误内容:', errorText);

              // 尝试解析错误响应
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { code: roomsRes.status, message: errorText };
              }

              console.error('房型详情接口错误:', errorData);

              // 根据错误码返回友好提示
              if (errorData.code === 40005) {
                // 房型已售罄
                return json({
                  code: 40005,
                  message: '抱歉，该酒店房间已被预订完，请选择其他酒店',
                  data: {
                    error: errorData.message,
                    suggestion: '建议：1) 选择其他酒店 2) 更改入住日期',
                    request_id: errorData.request_id
                  }
                }, { status: 400 });
              }

              if (errorData.code === 40002 || errorData.code === 40003) {
                // offer_id 已过期
                return json({
                  code: errorData.code,
                  message: '酒店预订链接已过期，请重新搜索',
                  data: {
                    error: errorData.message,
                    suggestion: '建议：重新搜索酒店后在10分钟内完成预订',
                    request_id: errorData.request_id
                  }
                }, { status: 400 });
              }

              // 其他错误，直接返回，不再尝试兜底
              return json({
                code: errorData.code || 500,
                message: errorData.message || '查询房型失败，请稍后重试',
                data: {
                  error: errorData.message,
                  suggestion: '建议：稍后重试或选择其他酒店',
                  request_id: errorData.request_id
                }
              }, { status: 400 });
            }

            const roomsData = await roomsRes.json();
            console.log('房型详情接口响应:', JSON.stringify(roomsData, null, 2));

            if (roomsData.code === 0 && roomsData.data) {
              // 从 room_types 中找到产品级 offer_id
              const roomTypes = roomsData.data.room_types || [];

              if (roomTypes.length === 0) {
                console.error('房型详情接口未返回房型信息');
                throw new Error('No room types available');
              }

              // 选择第一个房型的第一个产品（通常是最便宜的）
              let foundOfferId = null;

              for (const roomType of roomTypes) {
                const products = roomType.products || [];
                if (products.length > 0) {
                  // 找到第一个有 offer_id 的产品
                  const product = products.find(p => p.offer_id);
                  if (product) {
                    foundOfferId = product.offer_id;
                    console.log('找到产品级 offer_id，房型:', roomType.room_name, '产品:', product.product_name, '价格:', product.price);
                    break;
                  }
                }
              }

              if (foundOfferId) {
                finalOfferId = foundOfferId;
                console.log('成功获取产品级 offer_id:', finalOfferId.substring(0, 50) + '...');
              } else {
                console.error('房型详情接口未返回任何产品 offer_id');
                return json({
                  code: 400,
                  message: '该酒店暂无可预订房型',
                  data: {
                    suggestion: '建议：选择其他酒店或更改入住日期'
                  }
                }, { status: 400 });
              }
            } else {
              // 详情接口业务逻辑失败
              console.error('获取产品级 offer_id 失败:', roomsData);

              let errorMessage = '查询房型失败，请重新搜索酒店';
              if (roomsData.code === 50001 || roomsData.code === 40002) {
                errorMessage = 'offer_id 已过期或已失效，请重新搜索酒店';
              } else if (roomsData.message) {
                errorMessage = roomsData.message;
              }

              return json({
                code: roomsData.code || 500,
                message: errorMessage,
                data: {
                  error: roomsData.message,
                  suggestion: '建议：1) 重新搜索酒店 2) 搜索后尽快预订（10分钟内）',
                  request_id: roomsData.request_id
                }
              }, { status: 400 });
            }
          } catch (err) {
            console.error('调用房型详情接口失败:', err);
            console.error('错误详情:', err.message, err.stack);

            // 网络错误或其他异常，返回友好提示，不再尝试下单
            return json({
              code: 500,
              message: '查询房型失败，请稍后重试',
              data: {
                error: err.message,
                suggestion: '建议：稍后重试或联系客服'
              }
            }, { status: 500 });
          }
        }

        // 调用龙虾酒店订单创建接口
        const requestBody = {
          offer_id: finalOfferId,  // ✅ 使用实时的产品级 offer_id
          out_trade_no: orderNo,
          contact: contactData,
          guests: formattedGuests,
          pay_mode: 'user_pay'
        };

        console.log('龙虾酒店预订请求:', JSON.stringify(requestBody, null, 2));

        const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/hotel/order/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const longxiaData = await longxiaRes.json();
        console.log('龙虾酒店预订响应:', JSON.stringify(longxiaData, null, 2));

        if (longxiaData.code === 0) {
          const hotelOrder = longxiaData.data;

          // 保存到我们的数据库
          const result = await env.DB.prepare(`
            INSERT INTO orders (
              order_no, user_id, itinerary_id, item_type, item_name,
              total_amount, status, longxia_order_no, pay_url,
              contact_name, contact_phone, travel_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            orderNo,
            decoded.id,
            itinerary_id || null,
            'hotel',
            hotelOrder.hotel_name || item_name,
            hotelOrder.total_amount || unit_price,
            'pending',
            hotelOrder.order_no,
            hotelOrder.checkout_url || '',
            contactData.name,
            contactData.phone,
            travel_date || ''
          ).run();

          const orderId = result.meta.last_row_id;

          return json({
            code: 0,
            message: '酒店订单创建成功',
            data: {
              id: orderId,
              order_no: orderNo,
              longxia_order_no: hotelOrder.order_no,
              checkout_url: hotelOrder.checkout_url,
              pay_url: hotelOrder.checkout_url,
              hotel_name: hotelOrder.hotel_name,
              check_in: hotelOrder.check_in,
              check_out: hotelOrder.check_out,
              total_amount: hotelOrder.total_amount
            }
          });
        } else {
          // 返回龙虾 API 的详细错误信息
          console.error('龙虾酒店预订失败:', longxiaData);

          let errorMessage = longxiaData.message || '创建酒店订单失败';
          let suggestion = '';

          if (longxiaData.code === 50001) {
            errorMessage = '酒店预订失败';
            suggestion = '可能原因：1) offer_id 已过期 2) 房间已售罄 3) 价格已变动。建议重新搜索酒店。';
          }

          return json({
            code: longxiaData.code || 500,
            message: errorMessage,
            data: {
              error: longxiaData.message,
              suggestion: suggestion,
              request_id: longxiaData.request_id,
              details: longxiaData.data || null
            }
          }, { status: 400 });
        }
      } catch (err) {
        console.error('创建酒店订单失败:', err);
        console.error('错误堆栈:', err.stack);
        return json({
          code: 500,
          message: '创建酒店订单失败，请稍后重试',
          data: {
            error: err.message,
            details: err.stack
          }
        }, { status: 500 });
      }
    }

    // ========== 其他类型订单（原有逻辑） ==========
    // 验证必填字段
    if (!item_type || !item_name || !unit_price) {
      return json({ code: 400, message: '缺少必填字段', data: null }, { status: 400 });
    }

    const orderNo = generateOrderNo();
    const qty = quantity || 1;
    const totalAmount = (unit_price * qty).toFixed(2);

    // 插入订单
    const result = await env.DB.prepare(`
      INSERT INTO orders (order_no, user_id, itinerary_id, item_type, item_name, item_detail, quantity, unit_price, total_amount, travel_date, contact_name, contact_phone, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      orderNo,
      decoded.id,
      itinerary_id || null,
      item_type,
      item_name,
      item_detail || '',
      qty,
      unit_price,
      totalAmount,
      travel_date || '',
      contact_name || '',
      contact_phone || ''
    ).run();

    const orderId = result.meta.last_row_id;

    // 如果是普通用户（非管理员），调用龙虾支付 API 创建支付订单
    let payUrl = '';
    if (env.LONGXIA_TOKEN && decoded.role !== 'admin') {
      try {
        const longxiaRes = await fetch('https://api.longxia.dev/v1/pay/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_no: orderNo,
            amount: parseFloat(totalAmount),
            subject: item_name,
            body: item_detail || item_name,
            notify_url: 'https://concert-itinerary-api.music-tripay.workers.dev/api/payment/notify',
            return_url: `https://tripay-music-app.pages.dev/payment.html?order_id=${orderId}`
          })
        });

        if (longxiaRes.ok) {
          const longxiaData = await longxiaRes.json();
          if (longxiaData.pay_url) {
            payUrl = longxiaData.pay_url;

            // 更新订单的 pay_url
            await env.DB.prepare(
              'UPDATE orders SET pay_url = ? WHERE id = ?'
            ).bind(payUrl, orderId).run();
          }
        }
      } catch (err) {
        console.error('创建龙虾支付订单失败:', err);
        // 继续返回，但没有 pay_url（将走模拟支付）
      }
    }

    return json({
      code: 0,
      message: '订单创建成功',
      data: {
        id: orderId,
        order_no: orderNo,
        pay_url: payUrl
      }
    });
  } catch (err) {
    return json({ code: 500, message: '创建订单失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 获取订单列表
router.get('/api/orders', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') || '';

    // 构建查询
    let query = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [decoded.id];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const result = await env.DB.prepare(query).bind(...params).all();

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const countParams = [decoded.id];
    if (status && status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

    return json({
      code: 0,
      message: 'success',
      data: {
        list: result.results || [],
        total: countResult.total || 0,
        page,
        limit
      }
    });
  } catch (err) {
    return json({ code: 500, message: '获取订单列表失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 获取订单详情
router.get('/api/orders/:id', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const orderId = request.params.id;

    // 获取订单
    const order = await env.DB.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).bind(orderId).first();

    if (!order) {
      return json({ code: 404, message: '订单不存在', data: null }, { status: 404 });
    }

    // 检查权限（只能查看自己的订单，管理员可以查看所有订单）
    if (order.user_id !== decoded.id && decoded.role !== 'admin') {
      return json({ code: 403, message: '无权查看此订单', data: null }, { status: 403 });
    }

    // 如果是龙虾机票订单，获取最新状态
    if (order.longxia_order_no && order.item_type === 'flight') {
      try {
        const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/order/detail', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            system_no: order.longxia_order_no
          })
        });

        const longxiaData = await longxiaRes.json();

        if (longxiaData.code === 0) {
          const longxiaOrder = longxiaData.data;

          // 更新本地订单状态
          let localStatus = 'pending';
          if (longxiaOrder.pay_status === 'paid') {
            localStatus = 'paid';
          }

          await env.DB.prepare(
            'UPDATE orders SET status = ?, pnr = ? WHERE id = ?'
          ).bind(localStatus, longxiaOrder.pnr || '', orderId).run();

          // 返回合并后的订单信息
          return json({
            code: 0,
            message: 'success',
            data: {
              ...order,
              status: localStatus,
              pnr: longxiaOrder.pnr,
              flight_info: longxiaOrder.flight_info,
              pay_status: longxiaOrder.pay_status,
              flight_status: longxiaOrder.flight_status
            }
          });
        }
      } catch (err) {
        console.error('查询龙虾订单失败:', err);
      }
    }

    return json({ code: 0, message: 'success', data: order });
  } catch (err) {
    return json({ code: 500, message: '获取订单详情失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 支付订单
router.post('/api/orders/:id/pay', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const orderId = request.params.id;
    const body = await request.json();
    const paymentMethod = body.payment_method || body.pay_type || body.pay_method || 'wechat_h5';

    // 获取订单
    const order = await env.DB.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).bind(orderId).first();

    if (!order) {
      return json({ code: 404, message: '订单不存在', data: null }, { status: 404 });
    }

    // 检查权限
    if (order.user_id !== decoded.id && decoded.role !== 'admin') {
      return json({ code: 403, message: '无权支付此订单', data: null }, { status: 403 });
    }

    // 检查订单状态
    if (order.status === 'paid') {
      return json({ code: 400, message: '订单已支付', data: null }, { status: 400 });
    }

    if (order.status === 'cancelled') {
      return json({ code: 400, message: '订单已取消', data: null }, { status: 400 });
    }

    // ========== 如果是龙虾机票订单 ==========
    // 龙虾下单时已返回 checkout_url（收银台链接，存于 pay_url），直接跳转让用户在收银台选微信/支付宝支付
    if (order.longxia_order_no && order.item_type === 'flight') {
      try {
        // 优先使用下单时保存的收银台链接
        if (order.pay_url && order.pay_url.startsWith('http')) {
          return json({
            code: 0,
            message: '请跳转至收银台完成支付',
            data: {
              order_id: parseInt(orderId),
              pay_url: order.pay_url,
              checkout_url: order.pay_url,
              status: 'pending'
            }
          });
        }

        // 兜底：如果没有收银台链接，调用龙虾支付接口获取
        const pay_type = paymentMethod || 'wechat_h5';
        const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/order/pay', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            system_no: order.longxia_order_no,
            pay_type: pay_type
          })
        });

        const longxiaData = await longxiaRes.json();
        console.log('龙虾支付响应:', JSON.stringify(longxiaData, null, 2));

        if (longxiaData.code === 0) {
          await env.DB.prepare(
            'UPDATE orders SET pay_method = ? WHERE id = ?'
          ).bind(pay_type, orderId).run();

          return json({
            code: 0,
            message: '请完成支付',
            data: {
              order_id: parseInt(orderId),
              pay_params: longxiaData.data.pay_params,
              pay_type: longxiaData.data.pay_type,
              status: 'pending'
            }
          });
        } else {
          return json({
            code: longxiaData.code,
            message: longxiaData.message || '支付失败',
            data: null
          }, { status: 400 });
        }
      } catch (err) {
        console.error('机票订单支付失败:', err);
        return json({ code: 500, message: '支付失败: ' + err.message, data: null }, { status: 500 });
      }
    }

    // ========== 如果是龙虾酒店订单 ==========
    if (order.longxia_order_no && order.item_type === 'hotel') {
      try {
        // 优先使用下单时保存的收银台链接
        if (order.pay_url && order.pay_url.startsWith('http')) {
          return json({
            code: 0,
            message: '请跳转至收银台完成支付',
            data: {
              order_id: parseInt(orderId),
              pay_url: order.pay_url,
              checkout_url: order.pay_url,
              status: 'pending'
            }
          });
        }

        // 兜底：如果没有收银台链接，调用龙虾酒店支付接口
        const pay_type = paymentMethod || 'wechat_h5';

        console.log('酒店订单支付请求:', {
          order_id: orderId,
          order_no: order.longxia_order_no,
          pay_type: pay_type
        });

        const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/hotel/order/pay', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_no: order.longxia_order_no,  // 注意：酒店用 order_no，机票用 system_no
            pay_type: pay_type
          })
        });

        const longxiaData = await longxiaRes.json();
        console.log('龙虾酒店支付响应:', JSON.stringify(longxiaData, null, 2));

        if (longxiaData.code === 0) {
          // 更新支付方式
          await env.DB.prepare(
            'UPDATE orders SET pay_method = ? WHERE id = ?'
          ).bind(pay_type, orderId).run();

          return json({
            code: 0,
            message: '请完成支付',
            data: {
              order_id: parseInt(orderId),
              pay_params: longxiaData.data.pay_params,
              pay_type: longxiaData.data.pay_type,
              status: 'pending'
            }
          });
        } else {
          return json({
            code: longxiaData.code,
            message: longxiaData.message || '支付失败',
            data: null
          }, { status: 400 });
        }
      } catch (err) {
        console.error('酒店订单支付失败:', err);
        return json({ code: 500, message: '支付失败: ' + err.message, data: null }, { status: 500 });
      }
    }

    // ========== 管理员直接完成支付 ==========
    if (decoded.role === 'admin') {
      await env.DB.prepare(
        'UPDATE orders SET status = ?, pay_method = ?, paid_at = datetime("now", "localtime") WHERE id = ?'
      ).bind('paid', 'admin', orderId).run();

      return json({
        code: 0,
        message: '支付成功',
        data: {
          order_id: parseInt(orderId),
          status: 'paid'
        }
      });
    }

    // ========== 普通用户：尝试使用龙虾支付 API ==========
    if (env.LONGXIA_TOKEN) {
      try {
        // 调用龙虾支付 API 创建支付订单
        const longxiaRes = await fetch('https://api.longxia.dev/v1/pay/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_no: order.order_no,
            amount: parseFloat(order.total_amount),
            subject: order.item_name,
            body: order.item_detail || order.item_name,
            notify_url: 'https://concert-itinerary-api.music-tripay.workers.dev/api/payment/notify',
            return_url: `https://tripay-music-app.pages.dev/payment.html?order=${orderId}`
          })
        });

        if (longxiaRes.ok) {
          const longxiaData = await longxiaRes.json();

          // 更新订单的支付 URL
          if (longxiaData.pay_url) {
            await env.DB.prepare(
              'UPDATE orders SET pay_url = ?, pay_method = ? WHERE id = ?'
            ).bind(longxiaData.pay_url, paymentMethod || 'longxia', orderId).run();

            return json({
              code: 0,
              message: '请跳转至龙虾平台完成支付',
              data: {
                order_id: parseInt(orderId),
                pay_url: longxiaData.pay_url,
                status: 'pending'
              }
            });
          }
        }
      } catch (err) {
        console.error('龙虾支付 API 调用失败:', err);
        // 继续使用模拟支付
      }
    }

    // ========== 模拟支付（如果龙虾支付失败或未配置） ==========
    await env.DB.prepare(
      'UPDATE orders SET status = ?, pay_method = ?, paid_at = datetime("now", "localtime") WHERE id = ?'
    ).bind('paid', paymentMethod || 'mock', orderId).run();

    return json({
      code: 0,
      message: '支付成功',
      data: {
        order_id: parseInt(orderId),
        status: 'paid'
      }
    });
  } catch (err) {
    return json({ code: 500, message: '支付失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 同步订单支付状态（从龙虾平台）
router.post('/api/orders/:id/sync-status', async (request, env) => {
  try {
    // 验证登录
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const orderId = request.params.id;

    // 获取订单
    const order = await env.DB.prepare(
      'SELECT * FROM orders WHERE id = ?'
    ).bind(orderId).first();

    if (!order) {
      return json({ code: 404, message: '订单不存在', data: null }, { status: 404 });
    }

    // 检查权限
    if (order.user_id !== decoded.id && decoded.role !== 'admin') {
      return json({ code: 403, message: '无权查看此订单', data: null }, { status: 403 });
    }

    // 如果已经支付，直接返回
    if (order.status === 'paid') {
      return json({
        code: 0,
        message: 'success',
        data: {
          order_id: parseInt(orderId),
          status: 'paid',
          paid_at: order.paid_at
        }
      });
    }

    // 如果有 pay_url，说明使用了龙虾支付，需要查询状态
    if (order.pay_url && env.LONGXIA_TOKEN) {
      try {
        const longxiaRes = await fetch(`https://api.longxia.dev/v1/pay/query?order_no=${order.order_no}`, {
          headers: {
            'Authorization': `Bearer ${env.LONGXIA_TOKEN}`
          }
        });

        if (longxiaRes.ok) {
          const longxiaData = await longxiaRes.json();

          if (longxiaData.status === 'paid') {
            // 更新订单状态
            await env.DB.prepare(
              'UPDATE orders SET status = ?, paid_at = datetime("now", "localtime") WHERE id = ?'
            ).bind('paid', orderId).run();

            return json({
              code: 0,
              message: 'success',
              data: {
                order_id: parseInt(orderId),
                status: 'paid',
                paid_at: new Date().toISOString()
              }
            });
          }
        }
      } catch (err) {
        console.error('查询龙虾支付状态失败:', err);
      }
    }

    // 返回当前状态
    return json({
      code: 0,
      message: 'success',
      data: {
        order_id: parseInt(orderId),
        status: order.status,
        paid_at: order.paid_at
      }
    });
  } catch (err) {
    return json({ code: 500, message: '同步状态失败: ' + err.message, data: null }, { status: 500 });
  }
});

// 龙虾支付回调（支付成功通知）
router.post('/api/payment/notify', async (request, env) => {
  try {
    const body = await request.json();
    const { order_no, status } = body;

    if (status === 'paid') {
      // 更新订单状态
      await env.DB.prepare(
        'UPDATE orders SET status = ?, paid_at = datetime("now", "localtime") WHERE order_no = ?'
      ).bind('paid', order_no).run();
    }

    return new Response('success', { status: 200 });
  } catch (err) {
    console.error('处理支付回调失败:', err);
    return new Response('error', { status: 500 });
  }
});

// ==================== 行程管理 ====================

// 获取我的行程列表
router.get('/api/itineraries', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未授权', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const itineraries = await env.DB.prepare(`
      SELECT i.*, c.artist, c.city as concert_city, c.venue, c.concert_date
      FROM itineraries i
      LEFT JOIN concerts c ON i.concert_id = c.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(decoded.id, limit, offset).all();

    return json({
      code: 0,
      message: 'success',
      data: {
        itineraries: itineraries.results || [],
        pagination: { page, limit, total: itineraries.results?.length || 0 }
      }
    });
  } catch (error) {
    console.error('Get itineraries error:', error);
    return json({ code: 50001, message: '获取行程失败', data: null }, { status: 500 });
  }
});

// 获取行程详情
router.get('/api/itineraries/:id', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未授权', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const id = request.params.id;

    const itinerary = await env.DB.prepare(`
      SELECT i.*, c.artist, c.city as concert_city, c.venue, c.concert_date
      FROM itineraries i
      LEFT JOIN concerts c ON i.concert_id = c.id
      WHERE i.id = ? AND i.user_id = ?
    `).bind(id, decoded.id).first();

    if (!itinerary) {
      return json({ code: 40401, message: '行程不存在', data: null }, { status: 404 });
    }

    return json({ code: 0, message: 'success', data: itinerary });
  } catch (error) {
    console.error('Get itinerary error:', error);
    return json({ code: 50001, message: '获取行程失败', data: null }, { status: 500 });
  }
});

// 创建行程
router.post('/api/itineraries', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未授权', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const {
      concert_id, title, depart_city, dest_city, travel_date,
      flight_info, train_info, bus_info, taxi_info,
      hotel_info, check_in, check_out, total_budget,
      notes, is_public
    } = body;

    // 将对象转换为JSON字符串存储
    const flightInfoStr = flight_info ? JSON.stringify(flight_info) : '';
    const trainInfoStr = train_info ? JSON.stringify(train_info) : '';
    const busInfoStr = bus_info ? JSON.stringify(bus_info) : '';
    const taxiInfoStr = taxi_info ? JSON.stringify(taxi_info) : '';
    const hotelInfoStr = hotel_info ? JSON.stringify(hotel_info) : '';

    const result = await env.DB.prepare(`
      INSERT INTO itineraries (
        user_id, concert_id, title, depart_city, dest_city, travel_date,
        flight_info, train_info, bus_info, taxi_info, hotel_info,
        check_in, check_out, total_budget, notes, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      decoded.id, concert_id || null, title || '', depart_city || '', dest_city || '', travel_date || '',
      flightInfoStr, trainInfoStr, busInfoStr, taxiInfoStr, hotelInfoStr,
      check_in || '', check_out || '', total_budget || 0, notes || '', is_public ? 1 : 0
    ).run();

    return json({
      code: 0,
      message: '行程创建成功',
      data: { id: result.meta.last_row_id }
    });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return json({ code: 50001, message: '创建行程失败: ' + error.message, data: null }, { status: 500 });
  }
});

// 更新行程
router.put('/api/itineraries/:id', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未授权', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const id = request.params.id;
    const body = await request.json();

    const itinerary = await env.DB.prepare(
      'SELECT * FROM itineraries WHERE id = ? AND user_id = ?'
    ).bind(id, decoded.id).first();

    if (!itinerary) {
      return json({ code: 40401, message: '行程不存在', data: null }, { status: 404 });
    }

    const updates = [];
    const values = [];
    const allowedFields = [
      'title', 'depart_city', 'dest_city', 'travel_date', 'flight_info',
      'train_info', 'bus_info', 'taxi_info', 'hotel_info', 'check_in',
      'check_out', 'total_budget', 'notes', 'is_public'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        // 如果是对象类型的字段，转换为JSON字符串
        if (['flight_info', 'train_info', 'bus_info', 'taxi_info', 'hotel_info'].includes(field)) {
          values.push(body[field] ? JSON.stringify(body[field]) : '');
        } else if (field === 'is_public') {
          values.push(body[field] ? 1 : 0);
        } else {
          values.push(body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return json({ code: 40001, message: '没有要更新的字段', data: null }, { status: 400 });
    }

    updates.push(`updated_at = datetime('now', 'localtime')`);
    values.push(id);

    await env.DB.prepare(`
      UPDATE itineraries SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return json({ code: 0, message: '更新成功', data: null });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return json({ code: 50001, message: '更新行程失败', data: null }, { status: 500 });
  }
});

// 删除行程
router.delete('/api/itineraries/:id', async (request, env) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ code: 401, message: '未授权', data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return json({ code: 401, message: 'token 无效', data: null }, { status: 401 });
    }

    const id = request.params.id;

    const itinerary = await env.DB.prepare(
      'SELECT * FROM itineraries WHERE id = ? AND user_id = ?'
    ).bind(id, decoded.id).first();

    if (!itinerary) {
      return json({ code: 40401, message: '行程不存在', data: null }, { status: 404 });
    }

    await env.DB.prepare('DELETE FROM itineraries WHERE id = ?').bind(id).run();

    return json({ code: 0, message: '删除成功', data: null });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return json({ code: 50001, message: '删除行程失败', data: null }, { status: 500 });
  }
});

// 静态文件托管（需要绑定 Assets）
router.all('*', async (request, env) => {
  const url = new URL(request.url);

  // API 路由已经处理过了，如果到这里说明不是 API 请求
  if (url.pathname.startsWith('/api/')) {
    return json({ code: 404, message: '接口不存在', data: null }, { status: 404 });
  }

  // 尝试从 Assets 获取静态文件
  try {
    // 如果有 ASSETS 绑定，尝试获取静态文件
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // 没有 ASSETS 绑定，返回提示
    return new Response('Static files not configured. Please deploy frontend separately to Cloudflare Pages.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (err) {
    console.error('Static file error:', err);
    return new Response('File not found', { status: 404 });
  }
});

// 导出 Worker
export default {
  fetch: (request, ...args) =>
    router
      .fetch(request, ...args)
      .then(withCors)
      .catch(err => {
        console.error('Worker error:', err);
        return json({ code: 500, message: '服务器错误: ' + err.message, data: null }, { status: 500 });
      })
};
