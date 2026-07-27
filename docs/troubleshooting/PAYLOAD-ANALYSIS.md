# 前端 Payload 与龙虾 API 对比分析

## 📊 前端实际发送的 Payload

```json
{
  "item_type": "hotel",
  "item_name": "网鱼电竞酒店（上海陆家嘴滨江中心世博店）",
  "item_detail": "¥358/晚 | 距场馆3.02km | WiFi · 停车",
  "contact_name": "祝天皓",
  "contact_phone": "15112367591",
  "guests": [{
    "name": "祝天皓",
    "id_number": "510811200407180015",
    "id_type": "ID_CARD"
  }],
  "item_snapshot": {...},
  "offer_id": "hs_oXkbNyP3_csmN315yug6",
  "quantity": 1,
  "travel_date": "2026-08-15",
  "trip_context": {...},
  "unit_price": 358
}
```

## 🎯 龙虾 API 要求的格式

```json
{
  "offer_id": "HFSEqpfYon...",  // ✅ 必填 - 产品级 offer_id
  "out_trade_no": "MERCHANT_20260721_0001",  // ✅ 必填 - 商户订单号
  "contact": {  // ✅ 必填 - 对象格式
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com"  // 可选
  },
  "guests": [{  // ✅ 必填 - 数组格式
    "name": "张三",  // ✅ 必填
    "id_number": "330106199001011234",  // 可选
    "id_type": "ID_CARD",  // 可选
    "name_en": "ZHANG/SAN"  // 可选
  }],
  "pay_mode": "user_pay"  // 可选
}
```

## ❌ 问题对比分析

### 问题1: contact 格式不匹配 ⚠️

**前端发送**:
```json
{
  "contact_name": "祝天皓",     // ❌ 扁平结构
  "contact_phone": "15112367591"
}
```

**龙虾要求**:
```json
{
  "contact": {                  // ✅ 对象结构
    "name": "祝天皓",
    "phone": "15112367591"
  }
}
```

**结论**: ❌ **格式不匹配！前端没有按照对象格式发送 contact**

### 问题2: offer_id 格式

**前端发送**:
```json
{
  "offer_id": "hs_oXkbNyP3_csmN315yug6"  // ⚠️ 这是 search_offer_id (短格式)
}
```

**龙虾示例**:
```json
{
  "offer_id": "HFSEqpfYon0k6aVIlTcLQvzG3ATduYNP..."  // 产品级 offer_id (长格式)
}
```

**结论**: ⚠️ **可能是过期的 search_offer_id，不是产品级 offer_id**

### 问题3: guests 格式

**前端发送**:
```json
{
  "guests": [{
    "name": "祝天皓",
    "id_number": "510811200407180015",
    "id_type": "ID_CARD"
  }]
}
```

**龙虾要求**:
```json
{
  "guests": [{
    "name": "张三",          // ✅ 必填
    "id_number": "...",     // 可选
    "id_type": "ID_CARD"    // 可选
  }]
}
```

**结论**: ✅ **guests 格式正确**

### 问题4: out_trade_no 缺失

**前端发送**: ❌ 没有发送 `out_trade_no`

**龙虾要求**: ✅ 必填字段

**结论**: ❌ **缺少必填字段 out_trade_no**

## 🔍 后端转换逻辑检查

查看后端代码 `src/worker-with-proxy.js:1462-1550`:

```javascript
// 后端处理
const contactData = {
  name: contact?.name || contact_name || guests?.[0]?.name || '',  // ✅ 兼容处理
  phone: contact?.phone || contact_phone || guests?.[0]?.phone || '',  // ✅ 兼容处理
  email: contact?.email || contact_email || body.contact_email || ''
};

const orderNo = generateOrderNo();  // ✅ 生成订单号

const requestBody = {
  offer_id: offer_id,           // ⚠️ 直接使用前端的 offer_id
  out_trade_no: orderNo,        // ✅ 使用生成的订单号
  contact: contactData,         // ✅ 转换为对象格式
  guests: formattedGuests,      // ✅ 格式化后的 guests
  pay_mode: 'user_pay'
};
```

## ✅ 后端转换总结

| 字段 | 前端格式 | 后端转换 | 龙虾要求 | 状态 |
|------|---------|---------|---------|------|
| **contact** | `contact_name`, `contact_phone` (扁平) | ✅ 转换为 `{name, phone}` (对象) | 对象格式 | ✅ 正确 |
| **out_trade_no** | ❌ 缺失 | ✅ 自动生成 | 必填 | ✅ 正确 |
| **offer_id** | `hs_oXkbNyP3...` (search) | ⚠️ 直接传递 | 产品级 | ⚠️ **可能过期** |
| **guests** | ✅ 正确格式 | ✅ 保持格式 | 数组对象 | ✅ 正确 |
| **pay_mode** | ❌ 缺失 | ✅ 默认 `user_pay` | 可选 | ✅ 正确 |

## 🎯 根本问题

### 核心问题: offer_id 是 search_offer_id

**前端 offer_id**:
```
hs_oXkbNyP3_csmN315yug6
```

**特征**:
- 格式: `hs_` 开头
- 长度: 较短（26个字符）
- **这是 search_offer_id！**

**龙虾文档中的产品级 offer_id**:
```
HFSEqpfYon0k6aVIlTcLQvzG3ATduYNPOWa5FIddWEZdUxxi...
```

**特征**:
- 格式: 字母开头
- 长度: 很长（数百个字符）
- **这是产品级 offer_id**

## 📝 结论

### ✅ Payload 格式是符合的（经过后端转换）

后端已经正确地将前端的扁平格式转换为龙虾要求的对象格式：
- ✅ `contact_name` + `contact_phone` → `contact: {name, phone}`
- ✅ 自动生成 `out_trade_no`
- ✅ `guests` 格式正确
- ✅ 添加 `pay_mode: 'user_pay'`

### ❌ 但 offer_id 是过期的 search_offer_id

**问题根源**:
```
前端从搜索结果获取 → search_offer_id (hs_xxx)
                        ↓ (时间流逝 > 10分钟)
用户填写表单提交    → offer_id 已过期
                        ↓
后端调用龙虾 API   → 返回 50001 错误
                        ↓
错误信息：offer_id已过期或已失效
```

## 🔧 问题修复方案

### 方案1: 调用房型详情接口（推荐）

在后端调用龙虾订单创建前，先获取实时的产品级 offer_id：

```javascript
// src/worker-with-proxy.js 在 1505 行之前添加

// 如果 offer_id 是 search_offer_id (hs_ 开头)，先获取产品级 offer_id
let finalOfferId = offer_id;

if (offer_id && offer_id.startsWith('hs_')) {
  console.log('检测到 search_offer_id，获取产品级 offer_id...');
  
  try {
    const detailRes = await fetch('https://api.longxiachuxing.com/open/v1/hotel/detail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.LONGXIA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        search_offer_id: offer_id
      })
    });
    
    const detailData = await detailRes.json();
    
    if (detailData.code === 0 && detailData.data && detailData.data.offer_id) {
      finalOfferId = detailData.data.offer_id;
      console.log('获取到产品级 offer_id:', finalOfferId.substring(0, 50) + '...');
    } else {
      console.error('获取产品级 offer_id 失败:', detailData);
      return json({
        code: detailData.code || 500,
        message: 'offer_id 已过期，请重新搜索酒店',
        data: null
      }, { status: 400 });
    }
  } catch (err) {
    console.error('调用详情接口失败:', err);
    // 继续使用原 offer_id 尝试
  }
}

// 使用 finalOfferId 而不是 offer_id
const requestBody = {
  offer_id: finalOfferId,  // ✅ 使用实时的产品级 offer_id
  out_trade_no: orderNo,
  contact: contactData,
  guests: formattedGuests,
  pay_mode: 'user_pay'
};
```

### 方案2: 前端优化（辅助）

在前端预订时立即调用详情接口：

```javascript
// public/index.html 修改 purchaseItem 函数

// 用户点击购买酒店时
if (type === 'hotel' && offerId) {
  // 先获取实时 offer_id
  const detailRes = await apiPost('/api/hotel-detail', {
    search_offer_id: offerId
  });
  
  if (detailRes.code === 0) {
    offerId = detailRes.data.offer_id;  // 使用实时 offer_id
  }
}
```

---

**总结**:
- ✅ **Payload 格式符合龙虾 API 要求**（经过后端转换）
- ❌ **offer_id 是过期的 search_offer_id**（核心问题）
- 🔧 **解决方案**: 在创建订单前先调用详情接口获取实时的产品级 offer_id
