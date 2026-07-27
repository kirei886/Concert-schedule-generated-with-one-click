# 📦 Cloudflare Workers + D1 部署文档

> 演唱会出行一键生成器 - 完整部署指南

## 📋 目录

- [架构概述](#架构概述)
- [前置准备](#前置准备)
- [D1 数据库配置](#d1-数据库配置)
- [Worker 配置](#worker-配置)
- [部署步骤](#部署步骤)
- [环境变量配置](#环境变量配置)
- [验证部署](#验证部署)
- [常见问题](#常见问题)
- [回滚方案](#回滚方案)

---

## 🏗️ 架构概述

本项目采用 Cloudflare 全栈解决方案：

```
┌─────────────────────────────────────────┐
│  Cloudflare Workers (边缘计算)          │
│  ├── 静态资产托管 (前端 HTML/CSS/JS)    │
│  ├── API 路由 (后端逻辑)                │
│  └── 龙虾 API 代理                      │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Cloudflare D1 (分布式 SQLite)          │
│  ├── 用户数据                           │
│  ├── 演唱会信息                         │
│  ├── 行程订单                           │
│  └── 留言板内容                         │
└─────────────────────────────────────────┘
```

### 技术栈
- **前端托管**: Cloudflare Workers Assets
- **后端 API**: Cloudflare Workers (itty-router)
- **数据库**: Cloudflare D1 (SQLite)
- **CDN**: Cloudflare 全球网络

---

## 🔧 前置准备

### 1. 安装 Wrangler CLI

```bash
# 使用 npm 安装
npm install -g wrangler

# 验证安装
wrangler --version
```

### 2. 登录 Cloudflare 账号

```bash
wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

### 3. 确认账号信息

```bash
wrangler whoami
```

### 4. 确保项目依赖已安装

```bash
cd 111
npm install
```

---

## 🗄️ D1 数据库配置

### 1. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create concert-itinerary-db
```

**输出示例：**
```
✅ Successfully created DB 'concert-itinerary-db'
Database ID: 082c96f1-0e9e-41a9-b53e-e0bb1dad97ee
```

⚠️ **重要**: 复制输出的 `Database ID`，后面会用到。

### 2. 更新 wrangler.toml

编辑 `wrangler.toml`，更新数据库配置：

```toml
[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "你的数据库ID"  # 替换成上一步的 Database ID
```

### 3. 执行数据库迁移

按顺序执行所有迁移文件：

```bash
# 迁移 1: 创建基础表结构
wrangler d1 execute concert-itinerary-db --file=./migrations/0001_initial_tables.sql

# 迁移 2: 创建管理功能表
wrangler d1 execute concert-itinerary-db --file=./migrations/0002_management_tables.sql

# 迁移 3: 插入初始数据
wrangler d1 execute concert-itinerary-db --file=./migrations/0003_seed_data.sql
```

### 4. 验证数据库创建

```bash
# 查看数据库列表
wrangler d1 list

# 查看表结构
wrangler d1 execute concert-itinerary-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# 查看用户表数据（验证管理员账号）
wrangler d1 execute concert-itinerary-db --command="SELECT id, username, role FROM users LIMIT 5;"
```

---

## ⚙️ Worker 配置

### 1. 检查 wrangler.toml 配置

确保 `wrangler.toml` 配置正确：

```toml
# 项目名称（会成为你的 workers.dev 子域名）
name = "concert-itinerary-api"

# Worker 入口文件
main = "src/worker-with-proxy.js"

# 兼容日期
compatibility_date = "2024-01-01"

# 静态资产配置（前端文件）
assets = { directory = "./public", binding = "ASSETS" }

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "你的数据库ID"  # ⚠️ 必须替换

# 环境变量
[vars]
JWT_SECRET = "your-production-jwt-secret-change-this"  # ⚠️ 必须修改
LONGXIA_TOKEN = "rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk"  # ⚠️ 替换为你的龙虾API Token
```

### 2. 生成安全的 JWT_SECRET

```bash
# Linux/Mac
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的随机字符串替换 `wrangler.toml` 中的 `JWT_SECRET`。

### 3. 配置龙虾出行 API Token

1. 访问 [龙虾出行开放平台](https://longxiachuxing.com)
2. 注册并获取 API Token
3. 将 Token 替换到 `wrangler.toml` 的 `LONGXIA_TOKEN` 字段

---

## 🚀 部署步骤

### 方式一：使用自动化脚本（推荐）

#### Windows 用户

```bash
# 在 111 目录下运行
./deploy-cloudflare.bat
```

#### Linux/Mac 用户

```bash
# 在 111 目录下运行
chmod +x deploy-cloudflare.sh
./deploy-cloudflare.sh
```

### 方式二：手动部署

#### 1. 安装 Worker 依赖

```bash
npm install itty-router
```

#### 2. 部署 Worker

```bash
# 部署到 Cloudflare Workers
wrangler deploy
```

**成功输出示例：**
```
✨ Successfully published concert-itinerary-api (1.23 sec)
   https://concert-itinerary-api.你的账号.workers.dev
```

#### 3. 记录 Worker URL

复制输出的 Worker URL，格式为：
```
https://concert-itinerary-api.你的账号.workers.dev
```

---

## 🔐 环境变量配置

### 生产环境密钥配置

如果不想在 `wrangler.toml` 中明文存储密钥，可以使用 Wrangler Secrets：

```bash
# 设置 JWT 密钥
wrangler secret put JWT_SECRET
# 输入后按回车

# 设置龙虾 API Token
wrangler secret put LONGXIA_TOKEN
# 输入后按回车
```

### 查看已配置的 Secrets

```bash
wrangler secret list
```

### 删除 Secret

```bash
wrangler secret delete SECRET_NAME
```

---

## ✅ 验证部署

### 1. 测试 Worker 健康检查

```bash
curl https://concert-itinerary-api.你的账号.workers.dev/api/health
```

**预期响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-07-27T08:00:00.000Z",
  "database": "connected"
}
```

### 2. 测试前端访问

在浏览器中访问：
```
https://concert-itinerary-api.你的账号.workers.dev
```

应该能看到首页行程生成器界面。

### 3. 测试 API 接口

```bash
# 测试演唱会列表
curl https://concert-itinerary-api.你的账号.workers.dev/api/concerts

# 测试用户注册
curl -X POST https://concert-itinerary-api.你的账号.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123456"}'
```

### 4. 测试管理后台

访问：
```
https://concert-itinerary-api.你的账号.workers.dev/admin-dashboard.html
```

使用默认账号登录：
- 用户名: `admin`
- 密码: `admin123`

⚠️ **首次登录后立即修改密码！**

---

## 🎯 自定义域名（可选）

### 1. 在 Cloudflare Dashboard 中配置

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Workers & Pages
3. 选择你的 Worker (`concert-itinerary-api`)
4. 点击 "Settings" → "Triggers" → "Custom Domains"
5. 添加自定义域名（如 `api.yourdomain.com`）

### 2. 通过 Wrangler 配置

在 `wrangler.toml` 中添加：

```toml
routes = [
  { pattern = "api.yourdomain.com/*", custom_domain = true }
]
```

然后重新部署：

```bash
wrangler deploy
```

---

## 📊 监控与日志

### 查看实时日志

```bash
wrangler tail
```

### 查看部署历史

```bash
wrangler deployments list
```

### 在 Dashboard 中查看指标

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers & Pages → 你的 Worker
3. 查看请求数、错误率、响应时间等指标

---

## 🐛 常见问题

### 1. 数据库连接失败

**错误信息：**
```
Error: D1_ERROR: Database binding not found
```

**解决方案：**
- 检查 `wrangler.toml` 中的 `database_id` 是否正确
- 确认数据库已创建：`wrangler d1 list`
- 重新部署：`wrangler deploy`

### 2. JWT 认证失败

**错误信息：**
```
{"code":401,"message":"Token无效"}
```

**解决方案：**
- 检查 `JWT_SECRET` 是否配置
- 清除浏览器 localStorage 中的旧 token
- 重新登录

### 3. 龙虾 API 调用失败

**错误信息：**
```
{"code":-1,"message":"代理请求失败"}
```

**解决方案：**
- 验证 `LONGXIA_TOKEN` 是否有效
- 检查 API 配额是否用完
- 查看 Worker 日志：`wrangler tail`

### 4. 静态资源 404

**错误信息：**
```
404 Not Found
```

**解决方案：**
- 确认 `public/` 目录存在且包含文件
- 检查 `wrangler.toml` 中的 assets 配置
- 重新部署：`wrangler deploy`

### 5. 迁移文件执行失败

**错误信息：**
```
Error: SQL execution failed
```

**解决方案：**
```bash
# 检查 SQL 文件语法
cat migrations/0001_initial_tables.sql

# 逐条执行 SQL 语句进行调试
wrangler d1 execute concert-itinerary-db --command="CREATE TABLE IF NOT EXISTS users (...);"
```

### 6. 部署时出现 "bundle too large"

**解决方案：**
- 移除 `node_modules` 中不必要的依赖
- 使用 `wrangler deploy` 时会自动处理打包

---

## 🔄 更新部署

### 更新代码

```bash
# 1. 修改代码后重新部署
wrangler deploy

# 2. 查看新版本
wrangler deployments list
```

### 更新数据库 Schema

```bash
# 1. 创建新的迁移文件
# migrations/0004_your_changes.sql

# 2. 执行迁移
wrangler d1 execute concert-itinerary-db --file=./migrations/0004_your_changes.sql
```

### 更新环境变量

```bash
# 修改 wrangler.toml 后重新部署
wrangler deploy

# 或更新 Secret
wrangler secret put VARIABLE_NAME
```

---

## ⏪ 回滚方案

### 回滚到上一个版本

```bash
# 1. 查看部署历史
wrangler deployments list

# 2. 回滚到指定版本
wrangler rollback [deployment-id]
```

### 数据库回滚

⚠️ **D1 不支持自动回滚，需要手动恢复：**

```bash
# 1. 导出当前数据（备份）
wrangler d1 export concert-itinerary-db --output=backup.sql

# 2. 删除错误的表/数据
wrangler d1 execute concert-itinerary-db --command="DROP TABLE table_name;"

# 3. 重新执行正确的迁移
wrangler d1 execute concert-itinerary-db --file=./migrations/0001_initial_tables.sql
```

---

## 💰 成本估算

### Cloudflare Workers 免费套餐
- ✅ **100,000 请求/天**
- ✅ **10ms CPU 时间/请求**
- ✅ 无限带宽

### Cloudflare D1 免费套餐
- ✅ **5GB 存储**
- ✅ **500 万行读取/天**
- ✅ **10 万行写入/天**

### 适用场景
免费套餐足够支撑：
- 日活用户 < 10,000
- 日订单量 < 5,000

超出后按量付费：
- Workers: $0.30/百万请求
- D1: $0.50/百万行读取，$1.00/百万行写入

---

## 📚 进阶配置

### 配置多环境

在 `wrangler.toml` 中配置开发和生产环境：

```toml
[env.production]
name = "concert-itinerary-api"
vars = { ENVIRONMENT = "production" }

[env.staging]
name = "concert-itinerary-api-staging"
vars = { ENVIRONMENT = "staging" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db-staging"
database_id = "你的staging数据库ID"
```

部署到不同环境：

```bash
# 部署到生产环境
wrangler deploy --env production

# 部署到测试环境
wrangler deploy --env staging
```

### 配置 KV 缓存（可选）

如果需要缓存热点数据：

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "CACHE"
```

在 `wrangler.toml` 中添加：

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "你的KV命名空间ID"
```

---

## 🔒 安全检查清单

部署前务必确认：

- [ ] `JWT_SECRET` 已修改为随机强密码
- [ ] 默认管理员密码已修改
- [ ] `LONGXIA_TOKEN` 已配置正确的生产 Token
- [ ] 数据库迁移已全部执行完成
- [ ] API 接口测试通过
- [ ] 前端页面可正常访问
- [ ] 管理后台可正常登录
- [ ] CORS 配置正确（如需跨域）
- [ ] 日志监控已启用

---

## 📞 获取帮助

### 官方资源
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

### 社区支持
- [Cloudflare 社区论坛](https://community.cloudflare.com/)
- [Cloudflare Discord](https://discord.gg/cloudflaredev)

### 项目问题
- [GitHub Issues](https://github.com/Huiling-123/111/issues)

---

## 🎉 部署完成

恭喜！你的演唱会出行一键生成器已成功部署到 Cloudflare 全球网络。

**下一步：**
1. ✅ 分享你的应用 URL
2. ✅ 配置自定义域名
3. ✅ 监控应用性能
4. ✅ 收集用户反馈

---

<div align="center">

**Made with ❤️ by Claude Code**

[返回顶部](#-cloudflare-workers--d1-部署文档)

</div>
