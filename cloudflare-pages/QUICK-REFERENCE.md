# 🎵 演唱会行程生成器 - 快速参考

## 📋 访问地址

```
前端：https://tripay-music-app.pages.dev
后端：https://concert-itinerary-api.music-tripay.workers.dev
GitHub：https://github.com/kirei886/music-tripay-frontend
```

## 🔑 管理员账号

```
用户名：admin
密码：admin123
邮箱：admin@music.tripay.cn
```

## 🗄️ 数据库信息

```
类型：Cloudflare D1
名称：concert-itinerary-db
ID：082c96f1-0e9e-41a9-b53e-e0bb1dad97ee
表数量：19张
```

## 🛠️ 常用命令

### 本地开发
```bash
# 启动本地 Workers
wrangler dev

# 查询本地数据库
wrangler d1 execute concert-itinerary-db --command="SELECT * FROM users"

# 查询远程数据库
wrangler d1 execute concert-itinerary-db --remote --command="SELECT * FROM users"
```

### 部署
```bash
# 部署后端 API
wrangler deploy

# 部署前端（在 cloudflare-pages 目录）
wrangler pages deploy . --project-name=tripay-music-app

# 推送代码到 GitHub
git add .
git commit -m "更新描述"
git push
```

### 数据库操作
```bash
# 执行 SQL 文件（本地）
wrangler d1 execute concert-itinerary-db --file=./migrations/d1-schema.sql

# 执行 SQL 文件（远程）
wrangler d1 execute concert-itinerary-db --remote --file=./migrations/d1-schema.sql
```

## 🎯 核心 API 接口

```
GET  /api/health                 健康检查
GET  /api/settings/public        获取公开配置
POST /api/auth/login             用户登录
GET  /api/concerts               演唱会列表
GET  /api/cms/:slug              CMS内容
```

## 📁 项目结构

```
├── src/
│   ├── worker-v5.js            # Worker 主文件（生产）
│   ├── routes/                 # 路由文件（待扩展）
│   └── utils/                  # 工具函数
├── migrations/
│   ├── d1-schema.sql          # 数据库表结构
│   └── d1-seed.sql            # 初始数据
├── cloudflare-pages/          # 前端文件
│   ├── index.html
│   ├── login.html
│   ├── js/
│   └── css/
├── wrangler.toml              # Workers 配置
└── PROJECT-SUMMARY.md         # 完整文档
```

## 🔧 配置文件

### wrangler.toml（后端）
```toml
name = "concert-itinerary-api"
main = "src/worker-v5.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "082c96f1-0e9e-41a9-b53e-e0bb1dad97ee"
```

### api-config.js（前端）
```javascript
window.API_BASE = 'https://concert-itinerary-api.music-tripay.workers.dev';
```

## 📊 当前状态

```
✅ 数据库：已部署，19张表
✅ 后端 API：已上线，5个接口
✅ 前端：已上线，20个页面
✅ GitHub：代码已同步
✅ 全球加速：运行正常
```

## 🚀 下一步任务

### 短期（扩展 API）
```
⏭️ 用户注册 POST /api/auth/register
⏭️ 演唱会详情 GET /api/concerts/:id
⏭️ 行程创建 POST /api/itineraries
⏭️ 留言发布 POST /api/messages
⏭️ 收藏管理 POST /api/favorites
```

### 中期（第三方集成）
```
⏭️ 龙虾 API 集成（机票、酒店）
⏭️ 支付接口集成
⏭️ 地图 API 集成
```

### 长期（功能优化）
```
⏭️ 自定义域名配置
⏭️ 性能监控
⏭️ 移动端优化
⏭️ PWA 支持
```

## 💰 成本

```
当前：$0/月（免费额度内）
预计（10,000访问/天）：~$0.03/月
预计（100,000访问/天）：~$0.80/月
```

## 📞 快速链接

```
Cloudflare Dashboard：
https://dash.cloudflare.com/ced89b452ebc355c4ca36f6c282078a0

Workers 管理：
Workers & Pages > concert-itinerary-api

Pages 管理：
Workers & Pages > tripay-music-app

D1 数据库：
Storage & Databases > D1 > concert-itinerary-db
```

## 🐛 常见问题

### Q: API 返回 404？
A: 检查路由是否正确，确认 Worker 已部署

### Q: 前端无法访问？
A: 等待 DNS 传播（5-10分钟）

### Q: 数据库查询失败？
A: 确认数据库绑定正确，检查 wrangler.toml

### Q: CORS 错误？
A: 已配置 CORS，检查 API 地址是否正确

## 📝 更新日志

```
2026-07-20：v2.1 - 全栈部署完成 ✅
```

---

**项目状态：✅ 已上线**  
**快速访问：https://tripay-music-app.pages.dev** 🚀
