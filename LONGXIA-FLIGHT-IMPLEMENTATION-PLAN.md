# 🚀 龙虾机票预订功能实现计划

## 📋 已获得的完整文档

✅ **1. 搜索接口** - `/open/v1/flight/search`  
✅ **2. 报价接口** - `/open/v1/flight/pricing`  
✅ **3. 预订接口** - `/open/v1/flight/order/create`  
✅ **4. 支付接口** - `/open/v1/flight/order/pay`  
✅ **5. 订单详情** - `/open/v1/flight/order/detail`  
✅ **6. 订单列表** - `/open/v1/flight/order/list`

**API 基础信息**:
- **域名**: `https://api.longxiachuxing.com` ✅ (正确的域名)
- **认证**: `Authorization: Bearer rdak_live_xxx`
- **返回格式**: `{ code: 0, message: "success", data: {...} }`

---

## 🎯 完整的机票预订流程

### 流程图
```
用户输入出发地、目的地、日期
  ↓
【1. 搜索接口】查询航班列表
  ↓
显示航班列表（航班号、时间、价格）
  ↓
用户选择航班和舱位
  ↓
【2. 报价接口】验价（可选，如果搜索返回 pricing_required=true）
  ↓
填写乘客信息（姓名、证件号、手机）
  ↓
【3. 预订接口】创建龙虾订单
  获取 system_no（龙虾订单号）
  ↓
保存到我们的数据库
  ↓
【4. 支付接口】发起支付
  返回支付链接或收银台 URL
  ↓
跳转到支付页面
  ↓
【5. 订单详情】轮询支付状态
  检查 pay_status 是否为 paid
  ↓
支付完成，显示成功页面
```

---

## 🛠️ 需要实现的 Worker 接口

### 1. 修改现有的机票搜索接口

**路径**: `POST /api/flight-search`

**当前状态**: 返回模拟数据

**修改为**: 调用龙虾搜索接口

**实现**:
```javascript
router.post('/api/flight-search', async (request, env) => {
  const body = await request.json();
  const { origin, destination, date, cabin_class } = body;

  // 调用龙虾搜索接口
  const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trip_mode: 'domestic',
      trip_type: 'oneway',
      from_code: origin,
      to_code: destination,
      depart_date: date,
      cabin_class: cabin_class || 'economy',
      passengers: {
        adult: 1,
        child: 0,
        infant: 0
      },
      page_size: 20,
      sort_by: 'price'
    })
  });

  const data = await longxiaRes.json();
  
  if (data.code === 0) {
    return json({
      code: 0,
      message: 'success',
      data: {
        flights: data.data.flights,
        search_id: data.data.search_id
      }
    });
  } else {
    return json({
      code: data.code,
      message: data.message,
      data: null
    });
  }
});
```

---

### 2. 新增报价接口

**路径**: `POST /api/flight-pricing`

**用途**: 验价，获取可下单的 offer_id

**实现**:
```javascript
router.post('/api/flight-pricing', async (request, env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ code: 401, message: '请先登录', data: null }, { status: 401 });
  }

  const body = await request.json();
  const { search_offer_id, passengers } = body;

  // 调用龙虾报价接口
  const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/pricing', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      search_offer_id,
      passengers
    })
  });

  const data = await longxiaRes.json();
  return json(data);
});
```

---

### 3. 修改订单创建接口

**路径**: `POST /api/orders`

**修改**: 当 `item_type === 'flight'` 时调用龙虾预订接口

**实现**:
```javascript
router.post('/api/orders', async (request, env) => {
  // ... 验证登录 ...
  
  const body = await request.json();
  const { item_type, offer_id, passengers, contact, item_name, unit_price } = body;

  // 如果是机票订单，调用龙虾预订接口
  if (item_type === 'flight' && offer_id) {
    try {
      // 生成商户订单号
      const outTradeNo = generateOrderNo();

      // 调用龙虾预订接口
      const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/order/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          offer_id,
          out_trade_no: outTradeNo,
          passengers,
          contact,
          pay_mode: 'user_pay'
        })
      });

      const longxiaData = await longxiaRes.json();

      if (longxiaData.code === 0) {
        const longxiaOrder = longxiaData.data;

        // 保存到我们的数据库
        const result = await env.DB.prepare(`
          INSERT INTO orders (
            order_no, user_id, item_type, item_name, 
            total_amount, status, longxia_order_no, 
            passenger_name, passenger_id_card, flight_no
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          outTradeNo,
          decoded.id,
          'flight',
          item_name,
          longxiaOrder.total_amount,
          'pending',
          longxiaOrder.system_no,
          passengers[0].name,
          passengers[0].id_number,
          body.flight_no
        ).run();

        const orderId = result.meta.last_row_id;

        return json({
          code: 0,
          message: '订单创建成功',
          data: {
            id: orderId,
            order_no: outTradeNo,
            longxia_order_no: longxiaOrder.system_no,
            checkout_url: longxiaOrder.checkout_url
          }
        });
      } else {
        return json({
          code: longxiaData.code,
          message: longxiaData.message,
          data: null
        });
      }
    } catch (err) {
      return json({ code: 500, message: '创建订单失败: ' + err.message, data: null });
    }
  }

  // 其他订单类型的处理保持不变
  // ...
});
```

---

### 4. 修改支付接口

**路径**: `POST /api/orders/:id/pay`

**修改**: 当订单有 `longxia_order_no` 时调用龙虾支付接口

**实现**:
```javascript
router.post('/api/orders/:id/pay', async (request, env) => {
  // ... 验证登录和权限 ...
  
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();

  // 如果是龙虾机票订单
  if (order.longxia_order_no && order.item_type === 'flight') {
    const body = await request.json();
    const { pay_type } = body;

    try {
      // 调用龙虾支付接口
      const longxiaRes = await fetch('https://api.longxiachuxing.com/open/v1/flight/order/pay', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system_no: order.longxia_order_no,
          pay_type: pay_type || 'wechat_h5',
          return_url: `https://tripay-music-app.pages.dev/payment.html?order_id=${orderId}`
        })
      });

      const longxiaData = await longxiaRes.json();

      if (longxiaData.code === 0) {
        // 保存支付参数到订单
        await env.DB.prepare(
          'UPDATE orders SET pay_url = ?, pay_method = ? WHERE id = ?'
        ).bind(JSON.stringify(longxiaData.data.pay_params), pay_type, orderId).run();

        return json({
          code: 0,
          message: '请跳转至支付页面',
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
          message: longxiaData.message,
          data: null
        });
      }
    } catch (err) {
      return json({ code: 500, message: '支付失败: ' + err.message, data: null });
    }
  }

  // 其他支付方式保持不变
  // ...
});
```

---

### 5. 修改订单详情接口

**路径**: `GET /api/orders/:id`

**修改**: 如果是龙虾订单，调用龙虾订单详情接口获取最新状态

**实现**:
```javascript
router.get('/api/orders/:id', async (request, env) => {
  // ... 验证登录和权限 ...
  
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();

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

  // 返回本地订单信息
  return json({ code: 0, message: 'success', data: order });
});
```

---

## 📊 数据库表改动

需要给 `orders` 表添加以下字段：

```sql
-- 龙虾相关字段
ALTER TABLE orders ADD COLUMN longxia_order_no TEXT;      -- 龙虾订单号
ALTER TABLE orders ADD COLUMN pnr TEXT;                   -- 航空公司编码
ALTER TABLE orders ADD COLUMN flight_no TEXT;             -- 航班号
ALTER TABLE orders ADD COLUMN departure_time TEXT;        -- 起飞时间
ALTER TABLE orders ADD COLUMN arrival_time TEXT;          -- 到达时间

-- 乘客信息
ALTER TABLE orders ADD COLUMN passenger_name TEXT;        -- 乘客姓名
ALTER TABLE orders ADD COLUMN passenger_id_card TEXT;     -- 证件号
ALTER TABLE orders ADD COLUMN passenger_phone TEXT;       -- 手机号

-- 联系人信息
ALTER TABLE orders ADD COLUMN contact_name TEXT;          -- 联系人姓名
ALTER TABLE orders ADD COLUMN contact_phone TEXT;         -- 联系人手机

-- 额外信息
ALTER TABLE orders ADD COLUMN offer_id TEXT;              -- offer_id（验价返回）
ALTER TABLE orders ADD COLUMN search_offer_id TEXT;       -- search_offer_id（搜索返回）
```

---

## 🎨 前端改动

### 1. 首页 - 添加机票搜索框

```html
<div class="flight-search-box">
  <input type="text" placeholder="出发城市" id="flightOrigin">
  <input type="text" placeholder="目的地城市" id="flightDestination">
  <input type="date" id="flightDate">
  <button onclick="searchFlights()">搜索机票</button>
</div>
```

### 2. 创建机票列表页面

**新文件**: `cloudflare-pages/flights.html`

显示：
- 航班列表
- 航班号、起飞时间、到达时间
- 价格、舱位
- 点击"预订"按钮

### 3. 创建机票预订页面

**新文件**: `cloudflare-pages/flight-booking.html`

填写：
- 乘客信息（姓名、证件号、手机）
- 联系人信息
- 点击"确认预订"创建订单

---

## ⏱️ 实现时间估算

| 任务 | 时间 |
|------|------|
| 1. 修改数据库表结构 | 30分钟 |
| 2. 修改机票搜索接口 | 1小时 |
| 3. 添加报价接口 | 30分钟 |
| 4. 修改订单创建接口 | 1.5小时 |
| 5. 修改支付接口 | 1小时 |
| 6. 修改订单详情接口 | 30分钟 |
| 7. 前端页面开发 | 2小时 |
| 8. 测试完整流程 | 1小时 |
| **总计** | **8小时** |

---

## 🚀 分阶段实现

### 阶段 1: 后端接口（4小时）
1. ✅ 修改数据库表结构
2. ✅ 修改机票搜索接口
3. ✅ 添加报价接口
4. ✅ 修改订单创建接口
5. ✅ 修改支付接口
6. ✅ 修改订单详情接口

### 阶段 2: 前端页面（2小时）
7. ✅ 创建机票搜索页面
8. ✅ 创建机票列表页面
9. ✅ 创建机票预订页面

### 阶段 3: 测试（1小时）
10. ✅ 测试搜索功能
11. ✅ 测试预订流程
12. ✅ 测试支付流程

---

## 📝 重要注意事项

### 1. API 域名已更正
- ✅ 正确: `https://api.longxiachuxing.com`
- ❌ 错误: `https://api.longxia.dev`

### 2. Token 格式
- ✅ `Authorization: Bearer rdak_live_xxx`

### 3. 城市代码
搜索接口需要城市三字码（如 SHA, BJS, SZX），需要：
- 提供城市名称 → 城市代码的映射
- 或调用龙虾的城市查询接口

### 4. offer_id 有效期
- `search_offer_id` 和 `offer_id` 有效期 10 分钟
- 需要在验价后立即下单

### 5. 支付方式
龙虾支付接口支持多种支付方式：
- `wechat_h5` - 微信 H5
- `alipay_h5` - 支付宝 H5
- `wechat_native` - 微信扫码
- 等等

---

## 🎯 下一步行动

**准备好开始实现了吗？**

我们可以：
1. 从修改数据库表结构开始
2. 然后逐个实现后端接口
3. 最后开发前端页面

**需要我现在开始实现吗？**

---

**文档创建时间**: 2026-07-21 13:00  
**状态**: 📋 完整实现计划已制定，等待开始实现  
**预计完成时间**: 8 小时
