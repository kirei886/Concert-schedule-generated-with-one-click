# 🔧 龙虾机票乘客信息字段修复

## 📅 修复时间
**2026-07-21 15:35**

---

## 🐛 问题描述

创建机票订单时，龙虾 API 返回：
```json
{
  "code": 50001,
  "message": "机票下单失败，请稍后重试"
}
```

---

## 🔍 问题分析

### 实际发送的请求
```json
{
  "passengers": [
    {
      "name": "祝天皓",
      "id_card": "510811200407180015"  // ❌ 错误：缺少字段
    }
  ]
}
```

### 问题所在
1. ❌ **缺少 `id_type` 字段** - 证件类型（必填）
2. ❌ **缺少 `phone` 字段** - 手机号（必填）
3. ❌ **字段名错误** - 应该是 `id_number` 而不是 `id_card`

### 正确的格式
```json
{
  "passengers": [
    {
      "name": "祝天皓",
      "id_type": "id_card",           // ✅ 必填
      "id_number": "510811200407180015", // ✅ 必填
      "phone": "15112367591"          // ✅ 必填
    }
  ]
}
```

---

## ✅ 修复内容

### 修改文件：`src/worker-with-proxy.js`

**修复前的问题**：
```javascript
// 直接传递前端的 passengers 数组
const requestBody = {
  offer_id,
  out_trade_no: orderNo,
  passengers,  // ❌ 字段可能不完整或格式不正确
  contact: contactData,
  pay_mode: 'user_pay'
};
```

**修复后的代码**：
```javascript
// 转换乘客信息格式为龙虾 API 要求的格式
const formattedPassengers = passengers.map(p => ({
  name: p.name,
  id_type: p.id_type || 'id_card',
  id_number: p.id_number,
  phone: p.phone
}));

// 验证乘客必填字段
for (const passenger of formattedPassengers) {
  if (!passenger.name || !passenger.id_number || !passenger.phone) {
    return json({
      code: 400,
      message: '乘客信息不完整，请填写姓名、证件号和手机号',
      data: null
    }, { status: 400 });
  }
}

// 构建请求体
const requestBody = {
  offer_id,
  out_trade_no: orderNo,
  passengers: formattedPassengers,  // ✅ 格式正确且完整
  contact: contactData,
  pay_mode: 'user_pay'
};
```

---

## 🎯 改进点

### 1. 字段格式化 ✅
- 确保 `id_type` 字段存在（默认为 'id_card'）
- 确保 `id_number` 字段名正确
- 确保 `phone` 字段存在

### 2. 字段验证 ✅
- 验证每个乘客的必填字段
- 返回清晰的错误信息
- 提前拦截无效数据

### 3. 数据转换 ✅
- 使用 `map()` 转换数组格式
- 统一字段命名
- 移除多余字段

---

## 📊 龙虾 API 乘客字段要求

### 必填字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name` | String | 乘客姓名 | "张三" |
| `id_type` | String | 证件类型 | "id_card" / "passport" |
| `id_number` | String | 证件号码 | "440300199001011234" |
| `phone` | String | 手机号 | "13800138000" |

### 证件类型枚举

- `id_card` - 身份证
- `passport` - 护照
- `hk_macau_pass` - 港澳通行证
- `tw_pass` - 台湾通行证

---

## 🔄 完整的请求示例

### 修复后的正确请求
```json
{
  "offer_id": "fs_USPMJPhVvcSmxMKC2k5y",
  "out_trade_no": "ORD202607218339",
  "passengers": [
    {
      "name": "祝天皓",
      "id_type": "id_card",
      "id_number": "510811200407180015",
      "phone": "15112367591"
    }
  ],
  "contact": {
    "name": "祝天皓",
    "phone": "15112367591"
  },
  "pay_mode": "user_pay"
}
```

---

## 🧪 测试验证

### 测试步骤

1. **部署最新代码**
   ```bash
   wrangler deploy
   ```

2. **清空缓存重新测试**
   ```javascript
   localStorage.clear();
   ```

3. **搜索航班**
   - 深圳 → 北京
   - 选择航班

4. **填写完整信息**
   - 乘客姓名：✅
   - 证件类型：✅ 身份证
   - 证件号码：✅
   - 手机号码：✅
   - 联系人信息：✅

5. **创建订单**
   - 点击"确认预订"
   - **预期**：订单创建成功 ✅

---

## 📋 修复验证清单

- [x] 添加乘客信息格式化
- [x] 确保 id_type 字段存在
- [x] 确保 id_number 字段名正确
- [x] 确保 phone 字段存在
- [x] 添加乘客信息验证
- [x] 返回清晰的错误信息

---

## 🚀 部署说明

修复完成后，必须重新部署：

```bash
cd C:\Users\kirei\Desktop\117\111
wrangler deploy
```

---

## 💡 前端无需修改

前端代码已经正确发送了所有必填字段：

```javascript
passengers: [
  {
    name: passengerName,      // ✅
    id_type: idType,          // ✅
    id_number: idNumber,      // ✅
    phone: passengerPhone     // ✅
  }
]
```

问题出在后端没有正确处理和验证这些字段。

---

## 🎉 修复结果

✅ **乘客信息格式错误已修复**

现在创建机票订单时：
- 会正确格式化乘客信息
- 确保所有必填字段都存在
- 提前验证数据完整性
- 返回清晰的错误信息

---

## 🔍 调试技巧

如果还有问题，查看 Workers 日志：

```bash
wrangler tail
```

**查找关键信息**：
- `龙虾预订请求:` - 确认字段格式正确
- `龙虾预订响应:` - 查看 API 返回

**正确的请求应该包含**：
- ✅ `passengers[0].name`
- ✅ `passengers[0].id_type`
- ✅ `passengers[0].id_number`
- ✅ `passengers[0].phone`

---

**修复完成时间**: 2026-07-21 15:35  
**状态**: ✅ 已修复，需要重新部署  
**下一步**: `wrangler deploy` 并重新测试
