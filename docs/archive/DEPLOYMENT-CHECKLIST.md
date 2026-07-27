# Cloudflare Workers 部署验证清单

## ✅ 前置检查

### 1. 检查依赖安装

```bash
# 检查是否已安装 itty-router
npm list itty-router

# 如果没有，安装它
npm install itty-router bcryptjs
```

### 2. 检查 Wrangler 版本

```bash
wrangler --version
# 应该是 3.x 或更高版本
```

---

## 🚀 部署步骤

### 步骤1：创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create concert-itinerary-db

# 输出示例：
# ✅ Successfully created DB 'concert-itinerary-db'!
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "concert-itinerary-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要**：复制 `database_id`，然后编辑 `wrangler.toml`：

```bash
# 打开文件
notepad wrangler.toml

# 找到这一行：
database_id = "your-database-id-will-be-here"

# 替换为你的真实 database_id
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 保存文件
```

### 步骤2：初始化数据库

```bash
# 执行表结构创建
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-schema.sql

# 执行初始数据导入
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-seed.sql
```

### 步骤3：验证数据库

```bash
# 查看用户表
wrangler d1 execute concert-itinerary-db --command="SELECT * FROM users"

# 查看配置数量
wrangler d1 execute concert-itinerary-db --command="SELECT COUNT(*) as count FROM site_settings"

# 查看演唱会数量
wrangler d1 execute concert-itinerary-db --command="SELECT COUNT(*) as count FROM concerts"
```

**预期结果**：
- 用户表：1个管理员（admin）
- 配置表：22条记录
- 演唱会表：4条记录

### 步骤4：本地测试

```bash
# 启动开发服务器
wrangler dev
```

**在新的终端测试 API**：

```bash
# 测试健康检查
curl http://localhost:8787/api/health

# 预期返回：
# {"code":0,"message":"OK","data":{"status":"healthy","timestamp":"..."}}

# 测试登录
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"admin\",\"password\":\"admin123\"}"

# 预期返回包含 token

# 测试公开配置
curl http://localhost:8787/api/settings/public

# 预期返回配置列表
```

### 步骤5：部署到 Cloudflare

```bash
# 停止本地开发服务器（Ctrl+C）

# 部署到生产环境
wrangler deploy

# 成功后会显示：
# ✅ Deployed concert-itinerary-api
#    https://concert-itinerary-api.your-subdomain.workers.dev
```

### 步骤6：测试生产环境

```bash
# 使用你的 Workers URL 测试
curl https://concert-itinerary-api.your-subdomain.workers.dev/api/health

# 测试登录
curl -X POST https://concert-itinerary-api.your-subdomain.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"account\":\"admin\",\"password\":\"admin123\"}"
```

### 步骤7：配置自定义域名

```bash
# 方式1：命令行
wrangler domains add music.tripay.cn

# 方式2：Dashboard（推荐）
# 1. 访问 https://dash.cloudflare.com/
# 2. Workers & Pages > concert-itinerary-api
# 3. Settings > Triggers > Custom Domains
# 4. Add Custom Domain: music.tripay.cn
# 5. 或者配置路由：music.tripay.cn/api/*
```

---

## ⚠️ 常见问题

### 问题1：itty-router 找不到

**错误**：`Could not resolve "itty-router"`

**解决**：
```bash
npm install itty-router bcryptjs
```

### 问题2：database_id 未配置

**错误**：`DB binding not found`

**解决**：
```bash
# 1. 创建数据库
wrangler d1 create concert-itinerary-db

# 2. 复制 database_id

# 3. 编辑 wrangler.toml
notepad wrangler.toml

# 4. 替换 database_id
```

### 问题3：数据库表不存在

**错误**：`no such table: users`

**解决**：
```bash
# 执行数据库迁移
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-schema.sql
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-seed.sql
```

### 问题4：本地开发无法访问

**错误**：`Cannot connect to localhost:8787`

**解决**：
```bash
# 确保 wrangler dev 正在运行
# 检查端口是否被占用
netstat -ano | findstr :8787
```

---

## 📝 部署检查清单

在部署前，确认以下项目：

- [ ] 已安装 wrangler CLI
- [ ] 已安装 itty-router 和 bcryptjs
- [ ] 已创建 D1 数据库
- [ ] 已配置 database_id 到 wrangler.toml
- [ ] 已执行数据库迁移（schema + seed）
- [ ] 本地测试通过
- [ ] 已部署到 Cloudflare
- [ ] 生产环境测试通过
- [ ] 已配置自定义域名（可选）

---

## 🎉 完成后

访问你的应用：
- Workers URL: `https://concert-itinerary-api.your-subdomain.workers.dev`
- 自定义域名: `https://music.tripay.cn/api`

测试所有功能：
1. 用户注册/登录
2. 演唱会列表
3. CMS内容
4. 通知系统
5. 管理后台

**修改默认密码**：
登录后台 → 个人中心 → 修改密码

---

**祝部署顺利！** 🚀
