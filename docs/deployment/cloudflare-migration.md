# 🚀 Cloudflare 架构迁移指南

## 📋 迁移步骤概览

```
第一步：准备 Cloudflare 环境 ✅
第二步：创建 D1 数据库 ⏭️
第三步：部署 Workers API ⏭️
第四步：部署前端到 Pages ⏭️
第五步：配置域名和测试 ⏭️
```

---

## 第一步：准备 Cloudflare 环境

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 2. 验证登录

```bash
wrangler whoami
```

---

## 第二步：创建 D1 数据库

### 1. 创建数据库

```bash
wrangler d1 create concert-itinerary-db
```

**输出示例**：
```
✅ Successfully created DB 'concert-itinerary-db'!

[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要**：复制 `database_id`，更新到 `wrangler.toml` 文件中。

### 2. 更新 wrangler.toml

```bash
# 编辑 wrangler.toml
# 将 database_id 替换为实际值
```

### 3. 执行数据库迁移

```bash
# 执行表结构创建
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-schema.sql

# 执行初始数据导入
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-seed.sql
```

### 4. 验证数据库

```bash
# 查询表
wrangler d1 execute concert-itinerary-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# 查询用户
wrangler d1 execute concert-itinerary-db --command="SELECT * FROM users LIMIT 5"
```

---

## 第三步：部署 Workers API

### 1. 安装依赖

```bash
npm install itty-router bcryptjs jsonwebtoken
```

### 2. 本地测试

```bash
# 启动本地开发服务器
wrangler dev

# 访问测试
curl http://localhost:8787/api/health
```

### 3. 部署到 Cloudflare

```bash
# 部署到生产环境
wrangler deploy

# 查看部署信息
wrangler deployments list
```

### 4. 配置自定义域名

```bash
# 方式1：通过命令行
wrangler domains add music.tripay.cn

# 方式2：通过 Cloudflare Dashboard
# 1. 进入 Workers & Pages
# 2. 选择你的 Worker
# 3. Settings > Triggers > Custom Domains
# 4. 添加：music.tripay.cn/api/*
```

---

## 第四步：部署前端到 Pages

### 1. 准备前端文件

```bash
# 创建 Pages 部署目录
mkdir cloudflare-pages
cp -r public/* cloudflare-pages/

# 更新 API 地址
# 编辑所有 HTML 文件，将 API 地址改为：
# const API_BASE = 'https://music.tripay.cn/api'
```

### 2. 创建 Pages 项目

```bash
# 方式1：通过 Wrangler
wrangler pages project create concert-itinerary

# 方式2：通过 Dashboard
# 访问 https://dash.cloudflare.com/
# Pages > Create a project
```

### 3. 部署到 Pages

```bash
# 部署前端
cd cloudflare-pages
wrangler pages deploy . --project-name=concert-itinerary

# 或使用 Git 集成
# 1. 推送代码到 GitHub
# 2. 在 Cloudflare Pages 连接 GitHub 仓库
# 3. 自动部署
```

### 4. 配置自定义域名

```bash
# 在 Cloudflare Pages 设置中：
# Settings > Custom domains
# 添加：music.tripay.cn
```

---

## 第五步：配置域名

### DNS 配置

在 Cloudflare DNS 中添加记录：

```
类型: CNAME
名称: music
内容: concert-itinerary.pages.dev
代理: 已代理（橙色云朵）
```

### 验证访问

```bash
# 测试前端
curl https://music.tripay.cn

# 测试 API
curl https://music.tripay.cn/api/health

# 测试公开配置
curl https://music.tripay.cn/api/settings/public
```

---

## 🔧 关键文件清单

### 已创建的文件

```
✅ wrangler.toml                  # Workers 配置
✅ migrations/d1-schema.sql       # D1 表结构
✅ src/worker.js                  # Workers 入口（需完善）
⏭️ migrations/d1-seed.sql         # 初始数据（需创建）
⏭️ src/routes/*.js                # Workers 路由（需创建）
⏭️ src/utils/jwt.js               # JWT 工具（需创建）
⏭️ cloudflare-pages/              # 前端文件（需准备）
```

---

## ⚠️ 注意事项

### 1. 代码差异

**D1 vs SQLite**：
```javascript
// 原代码（同步）
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

// D1 代码（异步）
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
  .bind(id)
  .first();
```

### 2. Workers 限制

- CPU 时间：10ms - 50ms（免费版）
- 内存：128MB
- 请求大小：100MB
- 响应大小：100MB

### 3. D1 限制

- 免费版：5GB 存储
- 每天 500万次读取
- 每天 10万次写入

---

## 📊 迁移进度

### 当前状态

```
✅ wrangler.toml 配置文件
✅ D1 表结构 SQL
✅ Workers 入口文件框架
⏭️ 初始数据 SQL
⏭️ Workers 路由代码
⏭️ 前端 API 地址更新
⏭️ 测试和部署
```

---

## 🎯 下一步

我需要继续为你创建：

1. **d1-seed.sql** - 初始数据（管理员账号、配置等）
2. **Workers 路由文件** - 所有 API 路由的 Workers 版本
3. **JWT 工具** - Workers 环境的 JWT 处理
4. **前端更新脚本** - 批量更新 API 地址

**这是一个大工程，预计需要创建约 20 个文件。**

你希望我：
- A) 继续逐步创建所有文件
- B) 先创建关键文件，其他的提供模板
- C) 提供完整的迁移包（打包下载）

请告诉我你的选择！
