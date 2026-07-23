# 🚀 龙虾机票功能 - 快速启动指南

## 📋 前置条件

- ✅ Node.js 已安装
- ✅ Cloudflare Workers 账号
- ✅ 龙虾 API Token: `rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk`

---

## 🎯 5分钟快速启动

### 1️⃣ 运行数据库迁移（30秒）

```bash
cd C:\Users\kirei\Desktop\117\111
node -e "require('./src/init-db.js').initDatabase()"
```

**预期输出**：
```
[DB] 开始初始化数据库...
[DB] orders 表新增 longxia_order_no 列
[DB] orders 表新增 pnr 列
[DB] orders 表新增 flight_no 列
...
[DB] 数据库初始化完成
```

✅ 完成！数据库已准备好。

---

### 2️⃣ 本地测试（2分钟）

```bash
# 启动本地 Workers
npm run dev
# 或
wrangler dev
```

访问：`http://localhost:8787`

---

### 3️⃣ 测试机票搜索

**在浏览器中打开**：
```
http://localhost:8787/flights.html
```

**测试搜索**：
- 出发地：深圳（SZX）
- 目的地：北京（PEK）
- 日期：明天
- 舱位：经济舱

点击"搜索航班" ✈️

---

### 4️⃣ 部署到 Cloudflare（2分钟）

```bash
# 部署 Workers
wrangler deploy

# 部署前端页面
wrangler pages deploy cloudflare-pages
```

✅ 部署完成！

---

## 🔗 访问地址

### Workers API
```
https://concert-itinerary-api.music-tripay.workers.dev
```

### 前端页面
```
https://tripay-music-app.pages.dev/flights.html
```

---

## 🧪 快速测试

### 1. 测试机票搜索 API

```bash
curl -X POST https://concert-itinerary-api.music-tripay.workers.dev/api/flight-search \
  -H "Content-Type: application/json" \
  -d '{
    "from_code": "SZX",
    "to_code": "PEK",
    "depart_date": "2026-08-01",
    "cabin_class": "economy"
  }'
```

### 2. 测试完整流程

1. **登录**：
   - 访问：`https://tripay-music-app.pages.dev/login.html`
   - 用户名：`admin`
   - 密码：`admin123`

2. **搜索航班**：
   - 访问：`https://tripay-music-app.pages.dev/flights.html`
   - 输入出发地和目的地
   - 点击搜索

3. **预订机票**：
   - 选择航班
   - 填写乘客信息
   - 确认预订

4. **完成支付**：
   - 查看订单详情
   - 发起支付

---

## 📱 功能清单

### ✅ 已完成功能

- [x] 机票搜索（34个主要城市）
- [x] 航班列表展示
- [x] 实时报价
- [x] 在线预订
- [x] 乘客信息填写
- [x] 订单创建
- [x] 支付集成
- [x] 订单状态同步
- [x] PNR 查询

### 🎯 主要页面

1. **`flights.html`** - 机票搜索
2. **`flight-list.html`** - 航班列表
3. **`flight-booking.html`** - 机票预订
4. **`payment.html`** - 支付页面（已存在）
5. **`orders.html`** - 订单管理（已存在）

---

## 🔧 API 端点

### 机票相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/flight-search` | POST | 搜索航班 |
| `/api/flight-pricing` | POST | 航班报价 |
| `/api/orders` | POST | 创建订单 |
| `/api/orders/:id` | GET | 订单详情 |
| `/api/orders/:id/pay` | POST | 发起支付 |
| `/api/flight-order/:system_no` | GET | 查询龙虾订单 |

---

## 🎨 支持的城市

**华北地区**：北京、天津、石家庄、太原

**华东地区**：上海、杭州、南京、苏州、宁波、合肥、福州、厦门、南昌、济南、青岛

**华南地区**：广州、深圳、珠海、海口、三亚、南宁

**华中地区**：武汉、长沙、郑州

**西南地区**：成都、重庆、昆明、贵阳

**西北地区**：西安、兰州、银川、西宁、乌鲁木齐

**东北地区**：沈阳、大连、长春、哈尔滨

**特别地区**：拉萨

---

## 🔐 环境变量

确保 `wrangler.toml` 中配置正确：

```toml
[vars]
JWT_SECRET = "your-production-jwt-secret-change-this"
LONGXIA_TOKEN = "rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk"
```

---

## ⚠️ 重要提醒

### Offer ID 有效期
- `search_offer_id`: 10分钟有效
- `offer_id`: 10分钟有效
- ⚡ 建议验价后立即下单

### 支付方式
- 微信 H5: `wechat_h5`
- 支付宝 H5: `alipay_h5`
- 微信扫码: `wechat_native`

### 订单状态
- `pending` - 待支付
- `paid` - 已支付
- `cancelled` - 已取消

---

## 🐛 常见问题

### Q1: 搜索不到航班？
**A**: 检查城市代码是否正确，日期是否为未来日期。

### Q2: 创建订单失败？
**A**: 确保已登录，offer_id 未过期。

### Q3: 支付跳转失败？
**A**: 检查 LONGXIA_TOKEN 是否配置正确。

### Q4: 订单状态未更新？
**A**: 调用订单详情接口会自动同步龙虾订单状态。

---

## 📞 技术支持

### 相关文档
- [完整实施报告](LONGXIA-FLIGHT-COMPLETE.md)
- [API 需求文档](LONGXIA-FLIGHT-API-REQUIREMENTS.md)
- [实施计划](LONGXIA-FLIGHT-IMPLEMENTATION-PLAN.md)

### 龙虾 API
- 官方文档：https://docs.longxiachuxing.com
- API 域名：https://api.longxiachuxing.com

---

## 🎉 开始使用

现在你已经准备好了！访问以下地址开始体验：

```
https://tripay-music-app.pages.dev/flights.html
```

祝你使用愉快！✈️

---

**最后更新**: 2026-07-21 14:35  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
