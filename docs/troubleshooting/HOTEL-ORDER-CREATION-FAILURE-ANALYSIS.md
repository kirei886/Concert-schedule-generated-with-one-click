# 酒店订单创建失败问题分析

## 🔍 问题描述

### 问题1: 主页特价酒店预订
**界面**: 主页的"演唱会酒店品牌住宿"
**错误**: "参数错误，offer_id已过期或已失效，请重试"
**接口**: `/api/hotel-order-create`

### 问题2: 行程中酒店预订
**界面**: 创建行程后的酒店推荐
**错误**: "创建酒店订单失败，请稍后重试"
**接口**: `/api/orders` (item_type='hotel')

## 📊 问题分析

### 问题1分析: 特价酒店 offer_id 过期

#### 调用链路
```
前端: public/index.html:5549
    ↓
POST /api/hotel-order-create
    ↓
后端: src/worker-with-proxy.js:315
    ↓
调用龙虾: POST /open/v1/hotel/order/create
    ↓
龙虾返回: { code: 50001, message: "offer_id已过期" }
```

#### 根本原因
**offer_id 的有效期问题**

1. **搜索时获取的 offer_id**
   - 酒店搜索返回 `search_offer_id`
   - 这是搜索级别的临时ID
   - 有效期通常 10-15 分钟

2. **特价酒店的 offer_id 来源**
   ```javascript
   // src/worker-with-proxy.js:471 - 特价酒店接口
   router.get('/api/deal-hotels', async (request, env) => {
     // ...
     const hotels = json.data.hotels.map(h => ({
       offer_id: h.search_offer_id || '',  // ⚠️ 使用 search_offer_id
       // ...
     }));
   });
   ```

3. **为什么会过期**
   - 用户看到特价酒店列表（此时获取 offer_id）
   - 用户浏览、思考、填写表单（时间流逝）
   - 用户点击提交（可能已经超过10-15分钟）
   - offer_id 已过期

#### 技术细节

**龙虾API的 offer_id 类型**:
- **search_offer_id**: 搜索级别，短期有效（10-15分钟）
- **product_offer_id**: 产品级别，用于下单，需要通过详情接口获取

**现有实现的问题**:
```javascript
// 前端直接使用 search_offer_id 下单
POST /api/hotel-order-create
{
  offer_id: "hs_abc123...",  // search_offer_id
  // ...
}

// 后端直接传给龙虾
POST /open/v1/hotel/order/create
{
  offer_id: "hs_abc123...",  // ❌ 可能已过期
  // ...
}
```

**正确的流程应该是**:
```
1. 搜索酒店 → 获得 search_offer_id
2. 用户点击预订 → 调用详情接口
3. 详情接口 → 返回 product_offer_id (实时有效)
4. 使用 product_offer_id → 创建订单
```

### 问题2分析: 行程中酒店订单创建失败

#### 调用链路
```
前端: public/index.html:6588
    ↓
POST /api/orders
{
  item_type: 'hotel',
  offer_id: 'xxx',
  guests: [{name: 'xxx', id_number: '', id_type: ''}],
  // ...
}
    ↓
后端: src/worker-with-proxy.js:1462 (刚修复的部分)
    ↓
调用龙虾: POST /open/v1/hotel/order/create
    ↓
可能的错误原因？
```

#### 可能的原因

##### 原因1: offer_id 格式或有效性问题
```javascript
// 前端代码: public/index.html:6533
offerId = item.search_offer_id || item.offer_id || '';
```
同样可能使用了过期的 `search_offer_id`

##### 原因2: guests 参数格式问题
```javascript
// 前端发送: public/index.html:6608
guests: needGuests ? [{
  name: data.guestName,
  id_number: data.guestIdCard || '',
  id_type: data.guestIdCard ? 'ID_CARD' : ''
}] : undefined

// 后端处理: src/worker-with-proxy.js:1497
const formattedGuests = guests.map(g => {
  const guest = { name: g.name };
  if (g.id_number) {  // ⚠️ 空字符串会被判定为 false
    guest.id_number = g.id_number;
    guest.id_type = g.id_type || 'ID_CARD';
  }
  return guest;
});
```

**潜在问题**:
- 如果 `id_number` 是空字符串 `""`，条件 `if (g.id_number)` 为 false
- 但前端可能传了 `id_type: ''`
- 导致格式不一致

##### 原因3: 必填字段缺失

龙虾API可能要求某些字段，但我们没有传递：
```javascript
// 我们传的
{
  offer_id: "xxx",
  out_trade_no: "ORD...",
  contact: { name: "xxx", phone: "xxx", email: "" },
  guests: [{ name: "xxx" }],  // ⚠️ 可能缺少其他必填字段
  pay_mode: "user_pay"
}

// 龙虾可能需要
{
  // ... 上面的字段
  // arrival_time: "18:00",  // 可能需要
  // special_request: "",    // 可能需要
}
```

##### 原因4: 错误信息被包装

```javascript
// 后端 catch 块: src/worker-with-proxy.js:1545
catch (err) {
  console.error('创建酒店订单失败:', err);
  return json({
    code: 500,
    message: '创建酒店订单失败，请稍后重试',  // ⚠️ 通用错误信息
    data: { error: err.message }
  }, { status: 500 });
}
```

真实的龙虾API错误被包装成通用错误，导致无法看到具体原因。

## 🔧 排查步骤

### 步骤1: 查看实时日志

```bash
wrangler tail
```

然后触发订单创建，查看：
- 龙虾请求参数
- 龙虾响应内容
- 具体错误信息

### 步骤2: 检查前端发送的数据

浏览器开发者工具 → Network → 找到请求：

**问题1**: `/api/hotel-order-create`
```json
{
  "offer_id": "hs_xxx...",  // 检查格式
  "out_trade_no": "HT_xxx",
  "contact": {
    "name": "xxx",
    "phone": "xxx",
    "email": ""
  },
  "guests": [{
    "name": "xxx",
    "id_number": "",  // 检查是否为空
    "id_type": "ID_CARD"  // 检查当id_number为空时是否该传
  }]
}
```

**问题2**: `/api/orders`
```json
{
  "item_type": "hotel",
  "offer_id": "xxx",  // 检查格式
  "guests": [{
    "name": "xxx",
    "id_number": "",
    "id_type": ""  // ⚠️ 可能有问题
  }],
  // ... 其他字段
}
```

### 步骤3: 验证 offer_id 有效性

**测试1**: 立即预订
- 搜索酒店后立即点击预订
- 如果成功，说明是 offer_id 过期问题

**测试2**: 等待后预订
- 搜索酒店后等待 15 分钟
- 再点击预订
- 如果失败，确认是过期问题

### 步骤4: 检查龙虾API返回

在日志中查找：
```
龙虾酒店预订响应: {
  "code": 50001,  // 或其他错误码
  "message": "具体错误信息",
  "data": null
}
```

## 💡 推测的根本原因

### 问题1: offer_id 过期（高概率）

**证据**:
- 错误信息："offer_id已过期或已失效"
- 龙虾返回 code: 50001

**原因**:
- 使用 `search_offer_id` 直接下单
- 没有通过详情接口获取实时的 `product_offer_id`

### 问题2: 参数格式问题（高概率）

**证据**:
- 错误信息："创建酒店订单失败，请稍后重试"（通用错误）
- 可能是 catch 到了异常

**可能原因**:
1. **guests 参数格式不对**
   ```javascript
   // 当 id_number 为空字符串时
   guests: [{
     name: "xxx",
     id_number: "",
     id_type: ""  // ⚠️ 龙虾可能不接受空字符串
   }]
   ```

2. **offer_id 同样过期**
   - 行程中的酒店也是从搜索结果来的
   - 同样使用 `search_offer_id`

3. **缺少必要参数**
   - 可能缺少 check_in / check_out
   - 可能缺少其他龙虾要求的字段

## ✅ 建议的解决方案

### 短期修复（应急）

#### 修复1: 改进错误提示
```javascript
// 将通用错误改为显示龙虾的具体错误
catch (err) {
  console.error('创建酒店订单失败:', err);
  return json({
    code: 500,
    message: err.message || '创建酒店订单失败，请稍后重试',  // 显示具体错误
    data: { error: err.message, stack: err.stack }
  }, { status: 500 });
}
```

#### 修复2: 清理空字符串参数
```javascript
// 不传空的 id_number 和 id_type
const formattedGuests = guests.map(g => {
  const guest = { name: g.name };
  if (g.id_number && g.id_number.trim()) {  // ✅ 检查非空
    guest.id_number = g.id_number;
    guest.id_type = g.id_type || 'ID_CARD';
  }
  return guest;
});
```

### 长期方案（推荐）

#### 方案: 使用房型详情接口获取实时 offer_id

```javascript
// 用户点击预订时
async function bookHotel(hotelInfo) {
  // 1. 先调用详情接口获取实时 offer_id
  const detailRes = await apiPost('/api/hotel-detail', {
    search_offer_id: hotelInfo.search_offer_id
  });
  
  if (detailRes.code === 0) {
    const productOfferId = detailRes.data.offer_id;
    
    // 2. 使用实时 offer_id 创建订单
    const orderRes = await apiPost('/api/hotel-order-create', {
      offer_id: productOfferId,  // ✅ 实时有效的 offer_id
      // ...
    });
  }
}
```

## 🎯 立即需要做的

1. **查看实时日志** - 确认具体错误信息
2. **检查网络请求** - 查看前端发送的参数
3. **测试立即预订** - 验证是否是过期问题
4. **改进错误处理** - 显示龙虾的具体错误而不是通用错误

---

**当前状态**: 🔍 问题分析完成，等待日志验证
**优先级**: P0 - 核心功能不可用
**预计原因**: 
- 问题1: offer_id 过期（90%）
- 问题2: 参数格式或 offer_id 过期（80%）
