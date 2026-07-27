# ⚙️ 项目配置指南

> 演唱会行程生成器 - 完整配置文档

---

## 📋 目录

- [环境变量配置](#环境变量配置)
- [Cloudflare 配置](#cloudflare-配置)
- [数据库配置](#数据库配置)
- [第三方 API 配置](#第三方-api-配置)
- [网站配置](#网站配置)
- [开发环境配置](#开发环境配置)

---

## 🔐 环境变量配置

### 本地开发环境 (.env)

在项目根目录创建 `.env` 文件：

```bash
# 服务器配置
PORT=3000                                    # 服务器端口（默认 3000）
NODE_ENV=development                         # 环境：development | production

# JWT 认证
JWT_SECRET=your-super-secret-jwt-key-here    # ⚠️ 必须修改！至少 32 位随机字符串

# 龙虾出行 API
LONGXIA_TOKEN=your_longxia_api_token         # ⚠️ 必须配置！从龙虾出行获取

# 高德地图 API（可选）
AMAP_KEY=your_amap_api_key                   # 高德地图 Web 服务 API Key
```

### 生成安全的 JWT_SECRET

```bash
# 方式 1: 使用 OpenSSL（Linux/Mac）
openssl rand -hex 32

# 方式 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 方式 3: 在线生成
# 访问 https://www.random.org/strings/
```

**示例输出：**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

---

## ☁️ Cloudflare 配置

### wrangler.toml

项目根目录的 `wrangler.toml` 文件配置：

```toml
# ==================== 基础配置 ====================

# Worker 名称（会成为你的 workers.dev 子域名）
name = "concert-itinerary-api"

# Worker 入口文件
main = "src/worker-with-proxy.js"

# 兼容日期
compatibility_date = "2024-01-01"

# ==================== 静态资产配置 ====================

# 前端文件托管
assets = { directory = "./public", binding = "ASSETS" }

# ==================== D1 数据库配置 ====================

[[d1_databases]]
binding = "DB"                                      # 代码中使用的绑定名称
database_name = "concert-itinerary-db"              # 数据库名称
database_id = "082c96f1-0e9e-41a9-b53e-e0bb1dad97ee"  # ⚠️ 替换为你的数据库 ID

# ==================== 环境变量配置 ====================

[vars]
JWT_SECRET = "your-production-jwt-secret-change-this"  # ⚠️ 生产环境必须修改
LONGXIA_TOKEN = "rdak_live_YourActualTokenHere"        # ⚠️ 替换为真实 Token

# ==================== KV 存储（可选）====================

# 如需缓存，取消注释并创建 KV 命名空间
# [[kv_namespaces]]
# binding = "CACHE"
# id = "your-kv-namespace-id"

# ==================== 自定义域名（可选）====================

# routes = [
#   { pattern = "api.yourdomain.com/*", custom_domain = true }
# ]
```

### 获取 D1 数据库 ID

```bash
# 创建 D1 数据库
wrangler d1 create concert-itinerary-db

# 输出示例：
# ✅ Successfully created DB 'concert-itinerary-db'
# Database ID: 082c96f1-0e9e-41a9-b53e-e0bb1dad97ee
# 
# 复制 Database ID 到 wrangler.toml
```

### 使用 Wrangler Secrets（推荐）

**更安全的方式**：不在 `wrangler.toml` 中明文存储密钥

```bash
# 设置 JWT 密钥
wrangler secret put JWT_SECRET
# 输入密钥后按回车

# 设置龙虾 API Token
wrangler secret put LONGXIA_TOKEN
# 输入 Token 后按回车

# 查看已配置的 Secrets
wrangler secret list

# 删除 Secret
wrangler secret delete JWT_SECRET
```

---

## 🗄️ 数据库配置

### 本地开发（SQLite）

本地使用 SQLite 数据库，无需额外配置。数据库文件自动创建在：

```
data/app.db
```

### Cloudflare D1（生产环境）

#### 1. 创建数据库

```bash
wrangler d1 create concert-itinerary-db
```

#### 2. 执行迁移

```bash
# 迁移 1: 创建基础表
wrangler d1 execute concert-itinerary-db --file=./migrations/0001_initial_tables.sql

# 迁移 2: 创建管理功能表
wrangler d1 execute concert-itinerary-db --file=./migrations/0002_management_tables.sql

# 迁移 3: 插入初始数据
wrangler d1 execute concert-itinerary-db --file=./migrations/0003_seed_data.sql
```

#### 3. 验证数据库

```bash
# 查看所有表
wrangler d1 execute concert-itinerary-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# 查看用户表
wrangler d1 execute concert-itinerary-db --command="SELECT id, username, role FROM users;"
```

### 数据库管理命令

```bash
# 查看数据库列表
wrangler d1 list

# 导出数据库
wrangler d1 export concert-itinerary-db --output=backup.sql

# 删除数据库（谨慎！）
wrangler d1 delete concert-itinerary-db
```

---

## 🔌 第三方 API 配置

### 龙虾出行 API

#### 获取 API Token

1. 访问 [龙虾出行开放平台](https://longxiachuxing.com)
2. 注册账号并登录
3. 进入"开发者中心" → "API 密钥"
4. 创建新的 API Key
5. 复制 Token（格式：`rdak_live_xxxxxxxxxxxx`）

#### 配置 Token

**本地开发：**
```bash
# .env 文件
LONGXIA_TOKEN=rdak_live_your_actual_token
```

**Cloudflare 生产环境：**
```bash
# 方式 1: wrangler.toml
[vars]
LONGXIA_TOKEN = "rdak_live_your_actual_token"

# 方式 2: Secret（推荐）
wrangler secret put LONGXIA_TOKEN
```

#### API 端点

龙虾 API 会通过 Worker 代理：

- 机票搜索: `/api/longxia/flight/search`
- 高铁搜索: `/api/longxia/train/search`
- 酒店搜索: `/api/longxia/hotel/search`
- 巴士搜索: `/api/longxia/bus/search`

### 高德地图 API（可选）

#### 获取 API Key

1. 访问 [高德开放平台](https://lbs.amap.com)
2. 注册并创建应用
3. 选择"Web 服务"类型
4. 复制 API Key

#### 配置 Key

```bash
# .env 文件
AMAP_KEY=your_amap_web_service_key
```

---

## 🌐 网站配置

### 通过管理后台配置

访问管理后台进行配置：

```
http://localhost:3000/admin-dashboard.html
或
https://your-domain.workers.dev/admin-dashboard.html
```

登录后进入 "网站配置" 页面。

### 可配置项

#### 基础信息
- **网站名称**: 显示在浏览器标题栏
- **网站 Logo**: 上传或填写 URL
- **网站描述**: 首页描述文字
- **备案号**: ICP 备案信息

#### SEO 配置
- **关键词**: SEO 关键词（逗号分隔）
- **页面标题模板**: `{page} - {siteName}`

#### 功能开关
- **用户注册**: 是否开放注册
- **留言板**: 是否启用留言板
- **演唱会收藏**: 是否允许收藏演唱会

#### API 配置
- **龙虾 API Token**: 第三方 API Token
- **高德地图 Key**: 地图服务 Key

#### 联系方式
- **客服邮箱**
- **客服电话**
- **客服微信**

### 通过 API 配置

```bash
# 获取公开配置
curl http://localhost:3000/api/settings/public

# 获取所有配置（需管理员权限）
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/settings

# 更新配置
curl -X PUT -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"site_name":"新网站名称"}' \
  http://localhost:3000/api/settings
```

---

## 💻 开发环境配置

### Node.js 版本

```bash
# 推荐版本
Node.js >= 14.0.0
npm >= 6.0.0

# 查看当前版本
node --version
npm --version
```

### 安装依赖

```bash
# 安装项目依赖
npm install

# Cloudflare Workers 依赖
npm install itty-router
```

### 开发服务器

```bash
# 启动本地开发服务器
npm start
# 或
node server.js

# 访问
# 前台：http://localhost:3000
# 管理后台：http://localhost:3000/admin-dashboard.html
```

### Cloudflare Workers 本地开发

```bash
# 本地预览 Worker
wrangler dev

# 指定端口
wrangler dev --port 8787
```

---

## 🔒 安全配置建议

### 生产环境必查清单

- [ ] ✅ JWT_SECRET 已修改为强随机密码（至少 32 位）
- [ ] ✅ 默认管理员密码已修改（admin/admin123）
- [ ] ✅ LONGXIA_TOKEN 使用真实生产 Token
- [ ] ✅ 数据库 ID 正确配置
- [ ] ✅ 使用 Wrangler Secrets 存储敏感信息
- [ ] ✅ CORS 配置正确
- [ ] ✅ 已配置自定义域名（可选）
- [ ] ✅ 启用 HTTPS（Cloudflare 自动提供）

### 密钥管理最佳实践

1. **不要**将密钥提交到 Git
2. **使用** `.gitignore` 排除 `.env` 文件
3. **使用** Wrangler Secrets 管理生产密钥
4. **定期**轮换 API Token
5. **最小权限**原则：只授予必需的权限

---

## 🐛 配置问题排查

### JWT 认证失败

**症状：** 登录后提示"Token 无效"

**解决方案：**
```bash
# 1. 检查 JWT_SECRET 是否配置
echo $JWT_SECRET  # 本地
wrangler secret list  # Cloudflare

# 2. 清除浏览器 localStorage
# 浏览器控制台执行：
localStorage.clear()

# 3. 重新登录
```

### 龙虾 API 调用失败

**症状：** 机票/酒店查询失败

**解决方案：**
```bash
# 1. 验证 Token 是否有效
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.longxiachuxing.com/api/health

# 2. 检查 Token 配置
echo $LONGXIA_TOKEN  # 本地
wrangler secret list  # Cloudflare

# 3. 查看 Worker 日志
wrangler tail
```

### 数据库连接失败

**症状：** D1_ERROR: Database binding not found

**解决方案：**
```bash
# 1. 检查数据库 ID
wrangler d1 list

# 2. 验证 wrangler.toml 配置
cat wrangler.toml | grep -A 3 "d1_databases"

# 3. 重新部署
wrangler deploy
```

---

## 📚 相关文档

- [Cloudflare 完整部署指南](../deployment/cloudflare.md)
- [本地开发环境搭建](local-setup.md)
- [API 接口文档](api-reference.md)
- [数据库设计文档](database.md)

---

<div align="center">

**⚙️ 配置正确是项目运行的基础**

[返回文档导航](../README.md)

</div>
