# 📋 龙虾机票 API 字段映射完整文档

## ✅ 已添加的字段

### 前端新增字段

#### 机票表单新增字段：
1. **flightPassengerBirthday** - 出生日期（必填）
   - 类型：date
   - 格式：YYYY-MM-DD
   - 示例：1994-12-21

2. **flightPassengerSex** - 性别（必填）
   - 类型：select
   - 选项：1=男，0=女
   - 示例：1

3. **flightPassengerPhone** - 乘机人手机（必填）
   - 类型：tel
   - 格式：11位手机号
   - 示例：13800138000

4. **flightContactEmail** - 联系人邮箱（可选）
   - 类型：email
   - 格式：email@example.com
   - 示例：user@example.com

---

## 📊 完整字段映射表

### Passengers 字段映射

| 前端字段 | 后端处理后 | 龙虾 API 要求 | 类型 | 必填 | 说明 |
|---------|-----------|--------------|------|------|------|
| `data.flightPassengerName` | `p.name` | `name` | String | ✅ | 乘客姓名 |
| - | `p.id_type` | `id_type` | String | ✅ | 固定 "ID_CARD" |
| `data.flightPassengerIdCard` | `p.id_number` | `id_number` | String | ✅ | 身份证号 |
| `data.flightPassengerBirthday` | `p.birthday` | `birthday` | String | ✅ | 出生日期 YYYY-MM-DD |
| `data.flightPassengerPhone` | `p.phone` | `phone` | String | ✅ | 手机号 |
| - | `p.nationality_code` | `nationality_code` | String | ✅ | 固定 "CN" |
| `data.flightPassengerSex` | `p.sex` | `sex` | Integer | ✅ | 1=男, 0=女 |
| - | `p.type` | `type` | String | ✅ | 固定 "adult" |

### Contact 字段映射

| 前端字段 | 后端处理后 | 龙虾 API 要求 | 类型 | 必填 | 说明 |
|---------|-----------|--------------|------|------|------|
| `data.flightContactName` | `contact.name` | `name` | String | ✅ | 联系人姓名 |
| `data.flightContactPhone` | `contact.phone` | `phone` | String | ✅ | 联系人手机 |
| `data.flightContactEmail` | `contact.email` | `email` | String | ❌ | 联系人邮箱 |

### 其他字段

| 字段名 | 类型 | 必填 | 说明 |
|-------|------|------|------|
| `offer_id` | String | ✅ | 从搜索结果获取 |
| `out_trade_no` | String | ✅ | 订单号，格式 ORDYYYYMMDDxxxx |
| `callback_url` | String | ❌ | 回调URL（暂未实现）|
| `need_invoice` | Boolean | ❌ | 是否需要发票（默认false）|

---

## 🔄 后端数据转换逻辑

### 1. id_type 大小写转换

```javascript
const idTypeMap = {
  'id_card': 'ID_CARD',
  'passport': 'PASSPORT',
  'hk_macau_pass': 'HK_MACAU_PASS',
  'tw_pass': 'TW_PASS'
};
```

### 2. 乘客信息格式化

```javascript
const formattedPassengers = passengers.map(p => ({
  type: p.type || 'adult',
  name: p.name,
  id_type: idTypeMap[idType] || 'ID_CARD',
  id_number: p.id_number || p.id_card || '',
  birthday: p.birthday || '',
  phone: p.phone || '',
  nationality_code: p.nationality_code || 'CN',
  sex: parseInt(p.sex) || 1
}));
```

### 3. 联系人信息格式化

```javascript
const contactData = {
  name: contact?.name || contact_name || '',
  phone: contact?.phone || contact_phone || '',
  email: contact?.email || contact_email || ''
};
```

---

## 📝 完整请求示例

### 前端发送（index.html）

```javascript
{
  offer_id: "fs_xxx",
  out_trade_no: "ORD202607210001",
  passengers: [{
    name: "张三",
    id_type: "id_card",
    id_number: "440300199001011234",
    birthday: "1990-01-01",
    phone: "13800138000",
    nationality_code: "CN",
    sex: 1,
    type: "adult"
  }],
  contact: {
    name: "张三",
    phone: "13800138000",
    email: "zhang@example.com"
  }
}
```

### 后端转换后发送给龙虾

```json
{
  "offer_id": "fs_xxx",
  "out_trade_no": "ORD202607210001",
  "passengers": [
    {
      "type": "adult",
      "name": "张三",
      "id_type": "ID_CARD",
      "id_number": "440300199001011234",
      "birthday": "1990-01-01",
      "phone": "13800138000",
      "nationality_code": "CN",
      "sex": 1
    }
  ],
  "contact": {
    "name": "张三",
    "phone": "13800138000",
    "email": "zhang@example.com"
  },
  "pay_mode": "user_pay"
}
```

---

## 🎯 字段验证规则

### 必填字段验证

后端会验证以下字段：
- ✅ `passengers[].name` - 姓名
- ✅ `passengers[].id_number` - 证件号
- ✅ `passengers[].phone` - 手机号
- ✅ `passengers[].birthday` - 出生日期
- ✅ `passengers[].sex` - 性别
- ✅ `contact.name` - 联系人姓名
- ✅ `contact.phone` - 联系人手机

如果缺少任何必填字段，会返回详细错误：
```json
{
  "code": 400,
  "message": "乘客 1 信息不完整，缺少: 出生日期、性别",
  "data": {
    "passenger_index": 0,
    "missing_fields": ["出生日期", "性别"],
    "received_data": { ... }
  }
}
```

---

## 🔍 调试日志

### 后端会输出以下日志：

1. **收到的原始数据**
   ```
   === 机票订单创建开始 ===
   收到的原始数据: { ... }
   ```

2. **格式化后的乘客信息**
   ```
   乘客 1 信息: {
     "type": "adult",
     "name": "张三",
     "id_type": "ID_CARD",
     ...
   }
   ```

3. **发送给龙虾的请求**
   ```
   龙虾预订请求: { ... }
   ```

4. **龙虾返回的响应**
   ```
   龙虾预订响应: { ... }
   ```

---

## 🚀 测试步骤

### 1. 刷新页面
访问主页并强制刷新：
- Windows: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 2. 创建行程
- 出发地：深圳
- 目的地：北京
- 日期：选择未来日期

### 3. 填写完整信息
- ✅ 乘机人姓名
- ✅ 身份证号（18位）
- ✅ **出生日期**（新增）
- ✅ **性别**（新增）
- ✅ **乘机人手机**（新增）
- ✅ 联系人姓名
- ✅ 联系人手机
- ❌ 联系人邮箱（可选）

### 4. 提交订单
点击"立即购买"

### 5. 查看日志
```bash
wrangler tail
```

应该看到完整的字段信息。

---

## ✅ 部署状态

- **后端**: ✅ 已部署
  - Version: `2a2e8597-bb10-4251-bd53-d768bce6567f`
  - URL: https://concert-itinerary-api.music-tripay.workers.dev

- **前端**: ✅ 已部署
  - URL: https://220b362e.tripay-music-app.pages.dev

---

## 📞 如果还有问题

如果测试后还是返回错误，请提供：
1. `wrangler tail` 的完整日志
2. 浏览器控制台的错误信息
3. 填写的具体数据

---

**创建时间**: 2026-07-21 17:00  
**版本**: v2.0 - 完整字段支持  
**状态**: ✅ 所有必填字段已添加
