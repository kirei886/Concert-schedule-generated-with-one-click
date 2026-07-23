# 📋 支付功能实现说明

## 🔍 当前支付页面实现

支付页面位于 `cloudflare-pages/payment.html`，实现了完整的支付流程UI。

---

## 🎨 支付页面功能

### 1. 订单信息展示
- ✅ 订单号
- ✅ 商品名称
- ✅ 数量和单价
- ✅ 出行日期
- ✅ 详细信息
- ✅ 订单金额（大字体显示）

### 2. 支付方式选择
支持三种支付场景：

#### 场景 A: 管理员账号
```
🔑 管理员账号，可跳过支付环节
点击下方按钮直接完成订单
```
- 不显示支付方式选择
- 直接调用 `POST /api/orders/:id/pay` 完成支付
- 自动标记订单为已支付

#### 场景 B: 真实龙虾支付
```
💳 将跳转至龙虾平台进行真实支付
支付完成后请返回查看订单状态
```
- 订单有 `pay_url` 字段
- 点击"去龙虾平台支付"跳转到龙虾支付页面
- 每 5 秒轮询订单状态（调用 `POST /api/orders/:id/sync-status`）
- 检测到支付成功后显示成功页面

#### 场景 C: 模拟支付
```
💰 支付方式选择
○ 支付宝
○ 微信支付
○ 银行卡
```
- 普通用户且订单没有 `pay_url`
- 选择支付方式后调用 `POST /api/orders/:id/pay`
- 模拟支付成功

### 3. 支付成功页面
显示：
- ✅ 成功图标和提示
- ✅ "查看订单"按钮
- ✅ "查看我的行程"按钮（如果订单关联了行程）
- ✅ "返回首页"按钮

---

## 🔌 需要的 Worker 接口

支付页面需要以下接口：

### 1. 获取订单详情
```
GET /api/orders/:id
Authorization: Bearer {token}
```

**功能**: 获取订单的完整信息

**返回示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "order_number": "ORD20260721001",
    "user_id": 1,
    "itinerary_id": 5,
    "item_type": "concert",
    "item_id": 1,
    "item_name": "周杰伦嘉年华世界巡回演唱会门票",
    "item_detail": "上海站 | VIP座位 | 2026-08-15",
    "quantity": 2,
    "unit_price": 1280,
    "total_amount": 2560,
    "status": "pending",
    "payment_method": "",
    "travel_date": "2026-08-15",
    "pay_url": "",
    "created_at": "2026-07-21 11:40:00"
  }
}
```

---

### 2. 支付订单
```
POST /api/orders/:id/pay
Authorization: Bearer {token}
```

**功能**: 
- 管理员：直接标记订单为已支付
- 普通用户：模拟支付或创建龙虾支付订单

**请求示例**:
```json
{
  "payment_method": "alipay"
}
```

**返回示例（管理员/模拟支付）**:
```json
{
  "code": 0,
  "message": "支付成功",
  "data": {
    "order_id": 1,
    "status": "paid"
  }
}
```

**返回示例（龙虾真实支付）**:
```json
{
  "code": 0,
  "message": "请跳转至龙虾平台完成支付",
  "data": {
    "order_id": 1,
    "pay_url": "https://longxia.dev/pay/xxxxx",
    "status": "pending"
  }
}
```

---

### 3. 同步订单状态
```
POST /api/orders/:id/sync-status
Authorization: Bearer {token}
```

**功能**: 从龙虾平台同步订单支付状态（轮询使用）

**返回示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_id": 1,
    "status": "paid",
    "paid_at": "2026-07-21 11:45:00"
  }
}
```

---

### 4. 获取订单列表
```
GET /api/orders?page=1&limit=20&status=all
Authorization: Bearer {token}
```

**功能**: 获取当前用户的订单列表（"我的订单"页面使用）

**返回示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "order_number": "ORD20260721001",
        "item_name": "周杰伦嘉年华世界巡回演唱会门票",
        "total_amount": 2560,
        "status": "paid",
        "created_at": "2026-07-21 11:40:00"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### 5. 创建订单
```
POST /api/orders
Authorization: Bearer {token}
```

**功能**: 创建新订单（从行程生成器/演唱会购票等场景）

**请求示例**:
```json
{
  "itinerary_id": 5,
  "item_type": "concert",
  "item_id": 1,
  "item_name": "周杰伦嘉年华世界巡回演唱会门票",
  "item_detail": "上海站 | VIP座位 | 2026-08-15",
  "quantity": 2,
  "unit_price": 1280,
  "travel_date": "2026-08-15"
}
```

**返回示例**:
```json
{
  "code": 0,
  "message": "订单创建成功",
  "data": {
    "id": 1,
    "order_number": "ORD20260721001"
  }
}
```

---

## 🗄️ 数据库表结构

### orders 表
```sql
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number    TEXT UNIQUE NOT NULL,           -- 订单号
  user_id         INTEGER NOT NULL,               -- 用户 ID
  itinerary_id    INTEGER DEFAULT NULL,           -- 关联的行程 ID
  item_type       TEXT NOT NULL,                  -- 商品类型：concert/flight/train/hotel
  item_id         INTEGER DEFAULT NULL,           -- 商品 ID
  item_name       TEXT NOT NULL,                  -- 商品名称
  item_detail     TEXT DEFAULT '',                -- 商品详情
  quantity        INTEGER DEFAULT 1,              -- 数量
  unit_price      REAL NOT NULL,                  -- 单价
  total_amount    REAL NOT NULL,                  -- 总金额
  status          TEXT DEFAULT 'pending',         -- 状态：pending/paid/cancelled
  payment_method  TEXT DEFAULT '',                -- 支付方式
  travel_date     TEXT DEFAULT '',                -- 出行日期
  pay_url         TEXT DEFAULT '',                -- 龙虾支付 URL
  paid_at         TEXT DEFAULT NULL,              -- 支付时间
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
```

---

## 🎯 支付流程说明

### 流程 A: 管理员支付
```
1. 管理员登录
2. 访问支付页面（payment.html?order=1）
3. 看到"管理员可跳过支付"提示
4. 点击"管理员直接完成订单"
5. 调用 POST /api/orders/1/pay
6. 订单状态更新为 paid
7. 显示支付成功页面
```

---

### 流程 B: 龙虾真实支付
```
1. 用户登录
2. 创建订单时集成龙虾支付 API
3. 订单带有 pay_url 字段
4. 访问支付页面
5. 看到"将跳转至龙虾平台进行真实支付"
6. 点击"去龙虾平台支付"
7. 跳转到龙虾支付页面（新窗口）
8. 完成支付后返回
9. 每 5 秒调用 POST /api/orders/1/sync-status 轮询状态
10. 检测到状态变为 paid 后显示成功页面
```

---

### 流程 C: 模拟支付
```
1. 用户登录
2. 访问支付页面
3. 选择支付方式（支付宝/微信/银行卡）
4. 点击"确认支付"
5. 调用 POST /api/orders/1/pay {"payment_method": "alipay"}
6. 订单状态更新为 paid
7. 显示支付成功页面
```

---

## 📊 订单状态说明

| 状态 | 英文 | 说明 |
|------|------|------|
| 待支付 | pending | 订单已创建，等待支付 |
| 已支付 | paid | 支付完成 |
| 已取消 | cancelled | 订单已取消 |
| 已退款 | refunded | 订单已退款（可选） |

---

## 🔒 权限说明

### 订单查看权限
- ✅ 用户只能查看自己的订单
- ✅ 管理员可以查看所有订单

### 支付权限
- ✅ 用户只能支付自己的订单
- ✅ 管理员可以直接完成支付（跳过支付环节）

---

## ⚠️ 当前状态

### 前端（已完成）
- ✅ 支付页面 UI 完整
- ✅ 三种支付场景支持
- ✅ 订单状态轮询
- ✅ 支付成功页面

### 后端（缺失）
- ❌ `GET /api/orders/:id` - 获取订单详情
- ❌ `POST /api/orders/:id/pay` - 支付订单
- ❌ `POST /api/orders/:id/sync-status` - 同步订单状态
- ❌ `GET /api/orders` - 获取订单列表
- ❌ `POST /api/orders` - 创建订单

**需要在 Worker 中实现这些接口才能使支付功能正常工作。**

---

## 🚀 实现优先级

### P0 - 核心功能（必须实现）
1. `GET /api/orders/:id` - 支付页面必需
2. `POST /api/orders/:id/pay` - 支付功能必需
3. `POST /api/orders` - 创建订单必需

### P1 - 完整体验
4. `GET /api/orders` - "我的订单"页面必需
5. `POST /api/orders/:id/sync-status` - 龙虾支付必需（如果不用龙虾可以先不做）

---

## 💡 建议

### 方案 1: 简化实现（推荐）
- 暂不集成龙虾真实支付
- 管理员可以直接完成支付
- 普通用户使用模拟支付
- 实现 P0 的 3 个接口即可运行

### 方案 2: 完整实现
- 集成龙虾支付 API
- 实现真实支付流程
- 需要龙虾账号和 API 密钥
- 实现所有 5 个接口

**建议先使用方案 1，后续需要真实支付时再升级为方案 2。**

---

## 📝 下一步

需要我帮你实现订单相关的 Worker 接口吗？我可以：

1. ✅ 实现基础的订单 CRUD 接口
2. ✅ 实现模拟支付功能
3. ✅ 实现管理员直接完成支付
4. ⏸️ （可选）集成龙虾真实支付 API

---

**文档创建时间**: 2026-07-21 11:45  
**状态**: 📋 支付功能说明完成，等待接口实现
