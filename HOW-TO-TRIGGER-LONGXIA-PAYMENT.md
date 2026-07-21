# 🔧 如何触发龙虾真实支付

## 🔍 当前问题分析

### 为什么触发的是模拟支付？

**原因**: 支付页面判断支付模式的逻辑是基于订单的 `pay_url` 字段：

```javascript
// payment.html 的逻辑
if (_order.pay_url) {
  // 龙虾支付模式
} else if (_currentUser.role === 'admin') {
  // 管理员模式
} else {
  // 模拟支付模式
}
```

**问题流程**:
```
1. 创建订单 → 订单没有 pay_url
2. 访问支付页面 → 获取订单详情 → pay_url 为空
3. 判断为模拟支付模式 → 显示支付方式选择
4. 点击支付 → 调用龙虾 API → 更新 pay_url（但页面已经判断完了）
```

---

## ✅ 解决方案

有两种方案可以触发龙虾真实支付：

### 方案 A: 创建订单时就调用龙虾支付 API（推荐）

修改 `POST /api/orders` 接口，在创建订单时就调用龙虾支付 API 获取 `pay_url`。

**优点**:
- 订单创建时就有 `pay_url`
- 支付页面直接显示龙虾支付模式
- 用户体验好

**缺点**:
- 创建订单稍慢一点（需要等龙虾 API 响应）

---

### 方案 B: 获取订单详情时自动创建支付链接

修改 `GET /api/orders/:id` 接口，如果订单没有 `pay_url` 且状态为 `pending`，自动调用龙虾 API。

**优点**:
- 订单创建快
- 只有在访问支付页面时才调用龙虾 API

**缺点**:
- 逻辑稍复杂

---

## 🚀 推荐实现：方案 A

修改订单创建接口，在创建订单时就调用龙虾支付 API。

### 当前实现位置

在 `src/worker-with-proxy.js` 中找到 `POST /api/orders` 接口：

```javascript
router.post('/api/orders', async (request, env) => {
  // ... 验证和插入订单代码 ...
  
  const result = await env.DB.prepare(`
    INSERT INTO orders (order_no, user_id, itinerary_id, ...)
    VALUES (?, ?, ?, ...)
  `).bind(...).run();

  const orderId = result.meta.last_row_id;

  // ✅ 在这里添加龙虾支付 API 调用
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
      pay_url: payUrl  // 返回 pay_url
    }
  });
});
```

---

## 🔄 完整的龙虾支付流程

### 1. 创建订单
```
用户提交订单
  ↓
POST /api/orders
  ↓
插入订单到数据库
  ↓
调用龙虾支付 API
  ↓
获取 pay_url
  ↓
更新订单的 pay_url 字段
  ↓
返回订单信息（包含 pay_url）
```

### 2. 访问支付页面
```
用户访问 payment.html?order_id=1
  ↓
GET /api/orders/1
  ↓
获取订单详情（包含 pay_url）
  ↓
判断：order.pay_url 存在
  ↓
显示"将跳转至龙虾平台进行真实支付"
  ↓
按钮文字："去龙虾平台支付"
```

### 3. 支付流程
```
用户点击"去龙虾平台支付"
  ↓
打开新窗口：window.open(order.pay_url)
  ↓
用户在龙虾平台完成支付
  ↓
龙虾回调 POST /api/payment/notify
  ↓
更新订单状态为 paid
  ↓
前端每 5 秒轮询状态
  ↓
检测到 status = paid
  ↓
显示支付成功页面
```

---

## 🧪 测试龙虾支付

### 步骤 1: 测试龙虾 API

```bash
curl -X POST https://api.longxia.dev/v1/pay/create \
  -H "Authorization: Bearer rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "TEST001",
    "amount": 100,
    "subject": "测试订单",
    "body": "测试描述",
    "notify_url": "https://concert-itinerary-api.music-tripay.workers.dev/api/payment/notify",
    "return_url": "https://tripay-music-app.pages.dev/payment.html?order_id=1"
  }'
```

**期望返回**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pay_url": "https://pay.longxia.dev/xxxxx",
    "order_no": "TEST001"
  }
}
```

---

### 步骤 2: 检查订单是否有 pay_url

```bash
curl https://concert-itinerary-api.music-tripay.workers.dev/api/orders/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**期望返回**:
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "order_no": "ORD20260721001",
    "pay_url": "https://pay.longxia.dev/xxxxx",  // ← 应该有这个字段
    "status": "pending"
  }
}
```

---

### 步骤 3: 访问支付页面验证

访问 `https://tripay-music-app.pages.dev/payment.html?order_id=1`

**期望显示**:
```
💳 将跳转至龙虾平台进行真实支付
   支付完成后请返回查看订单状态

[去龙虾平台支付] ← 按钮
```

---

## ⚠️ 常见问题

### 1. 龙虾 API 调用失败

**可能原因**:
- Token 不正确
- 网络连接问题
- 龙虾 API 服务不可用

**解决方案**:
- 检查 `env.LONGXIA_TOKEN` 是否正确配置
- 检查 Worker 日志查看错误信息
- 降级为模拟支付

---

### 2. 订单没有 pay_url

**可能原因**:
- 龙虾 API 调用失败
- 用户是管理员（管理员不调用龙虾 API）
- `env.LONGXIA_TOKEN` 未配置

**解决方案**:
- 检查 Worker 日志
- 确认环境变量已配置
- 使用普通用户账号测试

---

### 3. 支付页面仍显示模拟支付

**可能原因**:
- 订单创建时没有调用龙虾 API
- `pay_url` 字段为空

**解决方案**:
- 按照方案 A 修改订单创建接口
- 重新创建订单测试

---

## 📋 实现检查清单

修改 Worker 后需要检查：

- [ ] `POST /api/orders` 接口在创建订单时调用龙虾 API
- [ ] 订单创建成功后有 `pay_url` 字段
- [ ] `env.LONGXIA_TOKEN` 正确配置
- [ ] 龙虾 API 可以正常访问
- [ ] 支付页面能正确识别龙虾支付模式
- [ ] 支付回调接口正常工作
- [ ] 状态轮询正常工作

---

## 🎯 当前状态

### 已实现 ✅
- 支付接口中有龙虾 API 调用逻辑
- 支付页面支持龙虾支付模式
- 状态轮询功能
- 支付回调处理

### 需要修改 ⚠️
- **订单创建时就调用龙虾 API**（核心问题）
- 让订单从创建时就有 `pay_url`

---

## 💡 快速修复

如果你希望快速测试龙虾支付，可以：

1. **手动给订单添加 pay_url**（临时测试）:
```sql
UPDATE orders 
SET pay_url = 'https://pay.longxia.dev/test_url' 
WHERE id = 1;
```

2. 访问支付页面，应该会显示龙虾支付模式

---

**需要我帮你实现方案 A 吗？** 

我可以修改 `POST /api/orders` 接口，让订单创建时就调用龙虾支付 API。

---

**文档创建时间**: 2026-07-21 12:15  
**状态**: 等待实现方案 A
