# 🔧 龙虾机票订单创建参数修复

## 📅 修复时间
**2026-07-21 15:10**

---

## 🐛 问题描述

创建机票订单时，龙虾 API 返回参数验证错误：

```
Key: 'FlightOrderCreateRequest.Contact.Name' Error:Field validation for 'Name' failed on the 'required' tag
Key: 'FlightOrderCreateRequest.Contact.Phone' Error:Field validation for 'Phone' failed on the 'required' tag
```

---

## 🔍 问题分析

### 根本原因

1. **Contact 字段可能为空**
   - 前端传递的 `contact` 对象可能未正确传递到后端
   - 后端没有验证 `contact.name` 和 `contact.phone` 是否存在

2. **字段回退逻辑不完善**
   - 当 `contact` 对象为空时，没有正确回退到 `contact_name` 和 `contact_phone`
   - 可能传递了空字符串给龙虾 API

---

## ✅ 修复内容

### 修改文件：`src/worker-with-proxy.js`

**修改位置**：订单创建接口（机票部分）

### 修复前的问题

```javascript
// 直接使用 contact 对象，可能为空或格式不正确
body: JSON.stringify({
  offer_id,
  out_trade_no: orderNo,
  passengers,
  contact,  // ❌ 可能是 undefined 或 {}
  pay_mode: 'user_pay'
})
```

### 修复后的代码

```javascript
// 1. 构建 contact 对象，确保字段存在
const contactData = {
  name: contact?.name || contact_name || passengers[0]?.name || '',
  phone: contact?.phone || contact_phone || passengers[0]?.phone || ''
};

// 2. 验证必填字段
if (!contactData.name || !contactData.phone) {
  return json({
    code: 400,
    message: '联系人姓名和手机号为必填项',
    data: null
  }, { status: 400 });
}

// 3. 验证乘客信息
if (!passengers || passengers.length === 0) {
  return json({
    code: 400,
    message: '请填写乘客信息',
    data: null
  }, { status: 400 });
}

// 4. 构建请求体
const requestBody = {
  offer_id,
  out_trade_no: orderNo,
  passengers,
  contact: contactData,  // ✅ 确保有正确的值
  pay_mode: 'user_pay'
};

// 5. 添加调试日志
console.log('龙虾预订请求:', JSON.stringify(requestBody, null, 2));

// 6. 调用 API
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
```

---

## 🎯 改进点

### 1. 数据验证 ✅
- 在调用龙虾 API 之前验证所有必填字段
- 确保 `contact.name` 和 `contact.phone` 不为空

### 2. 字段回退逻辑 ✅
优先级顺序：
```
contact.name → contact_name → passengers[0].name
contact.phone → contact_phone → passengers[0].phone
```

### 3. 错误处理增强 ✅
```javascript
if (longxiaData.code === 0) {
  // 成功处理
} else {
  // 返回详细错误信息
  console.error('龙虾预订失败:', longxiaData);
  return json({
    code: longxiaData.code || 500,
    message: longxiaData.message || '创建订单失败',
    data: {
      error: longxiaData.message,
      details: longxiaData.data || null
    }
  }, { status: 400 });
}
```

### 4. 调试日志 ✅
- 记录请求参数
- 记录响应结果
- 方便排查问题

---

## 🧪 测试验证

### 测试场景

#### ✅ 场景 1：正常填写所有信息
**输入**:
- 乘客姓名：张三
- 证件号：440xxxxxxxxxxxxx
- 乘客手机：13800138000
- 联系人姓名：张三
- 联系人手机：13800138000

**预期**: 订单创建成功 ✅

#### ✅ 场景 2：只填写乘客信息，联系人自动填充
**输入**:
- 乘客信息完整
- 联系人信息为空

**预期**: 使用乘客信息作为联系人 ✅

#### ❌ 场景 3：缺少必填字段
**输入**:
- 缺少联系人姓名或手机

**预期**: 返回错误 "联系人姓名和手机号为必填项" ✅

---

## 📊 龙虾 API 要求

### Contact 对象格式

```json
{
  "contact": {
    "name": "张三",     // ✅ 必填
    "phone": "13800138000"  // ✅ 必填
  }
}
```

### Passengers 数组格式

```json
{
  "passengers": [
    {
      "name": "张三",           // ✅ 必填
      "id_type": "id_card",    // ✅ 必填
      "id_number": "440...",   // ✅ 必填
      "phone": "138..."        // ✅ 必填
    }
  ]
}
```

---

## 🔄 完整请求示例

### 正确的请求格式

```json
{
  "offer_id": "offer_abc123",
  "out_trade_no": "ORD202607210001",
  "passengers": [
    {
      "name": "张三",
      "id_type": "id_card",
      "id_number": "440xxxxxxxxxxxxxxx",
      "phone": "13800138000"
    }
  ],
  "contact": {
    "name": "张三",
    "phone": "13800138000"
  },
  "pay_mode": "user_pay"
}
```

---

## 🚀 部署说明

修复完成后，需要重新部署 Workers：

```bash
cd C:\Users\kirei\Desktop\117\111
wrangler deploy
```

---

## 📝 前端无需修改

前端代码（`flight-booking.html`）已经正确发送了 `contact` 对象：

```javascript
contact: {
  name: contactName,
  phone: contactPhone
}
```

问题出在后端没有正确处理和验证这些字段。

---

## ✅ 修复验证清单

- [x] 添加 contact 字段验证
- [x] 实现字段回退逻辑
- [x] 添加乘客信息验证
- [x] 增强错误处理
- [x] 添加调试日志
- [x] 返回详细错误信息

---

## 💡 注意事项

1. **字段名称大小写**
   - 龙虾 API 使用小写字段名：`name`, `phone`
   - 不是大写开头的：~~`Name`, `Phone`~~

2. **空字符串问题**
   - 不要传递空字符串 `""`
   - 使用验证确保字段有实际值

3. **手机号格式**
   - 前端已有验证：`^1[3-9]\d{9}$`
   - 确保是 11 位有效手机号

4. **调试技巧**
   - 查看 Workers 日志中的请求和响应
   - 检查 `console.log` 输出

---

## 🎉 修复结果

✅ **订单创建参数错误已修复**

现在创建机票订单时：
- 会正确验证联系人信息
- 确保所有必填字段都有值
- 提供详细的错误信息
- 添加调试日志方便排查

---

**修复完成时间**: 2026-07-21 15:10  
**状态**: ✅ 已修复，可以测试  
**下一步**: 重新部署并测试订单创建流程
