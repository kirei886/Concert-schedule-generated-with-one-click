# 快速参考指南 (Quick Reference)

## 🚀 常用命令

### 启动服务器
```bash
cd 111
npm start
# 访问 http://localhost:3000
```

### 查看数据
```bash
node view-data.js
```

### 测试API
```bash
node test-api.js
```

### 重新迁移数据库
```bash
node migrate.js
```

---

## 🔗 快速链接

| 页面 | URL | 需要登录 |
|------|-----|---------|
| **前台** | | |
| 首页（行程生成器） | http://localhost:3000 | ❌ |
| 登录 | http://localhost:3000/login.html | ❌ |
| 注册 | http://localhost:3000/register.html | ❌ |
| 我的行程 | http://localhost:3000/my-trips.html | ✅ |
| 我的订单 | http://localhost:3000/orders.html | ✅ |
| 留言板 | http://localhost:3000/messages.html | ❌ |
| 个人中心 | http://localhost:3000/profile.html | ✅ |
| **管理后台** | | |
| 仪表盘 | http://localhost:3000/admin-dashboard.html | ✅ 管理员 |
| 网站配置 | http://localhost:3000/admin-settings.html | ✅ 管理员 |
| 内容管理 | http://localhost:3000/admin-cms.html | ✅ 管理员 |
| 通知管理 | http://localhost:3000/admin-notifications.html | ✅ 管理员 |
| 演唱会管理 | http://localhost:3000/admin-concerts.html | ✅ 管理员 |

---

## 👤 默认账号

```
管理员账号：
用户名：admin
密码：admin123
邮箱：admin@example.com

⚠️ 重要：首次登录后请立即修改密码！
```

---

## 📡 API 接口速查

### 认证 API
```bash
POST   /api/auth/register      # 注册
POST   /api/auth/login         # 登录
GET    /api/auth/me            # 获取当前用户
PUT    /api/auth/profile       # 更新个人信息
```

### 网站配置 API
```bash
GET    /api/settings/public           # 获取公开配置
GET    /api/settings                  # 获取所有配置 [管理员]
PUT    /api/settings                  # 更新配置 [管理员]
POST   /api/settings                  # 创建配置 [管理员]
DELETE /api/settings/:key             # 删除配置 [管理员]
```

### CMS API
```bash
GET    /api/cms/contents               # 获取内容列表
GET    /api/cms/:slug                  # 获取内容详情
POST   /api/cms/contents               # 创建内容 [管理员]
PUT    /api/cms/contents/:id           # 更新内容 [管理员]
DELETE /api/cms/contents/:id           # 删除内容 [管理员]
```

### 通知 API
```bash
GET    /api/notifications              # 获取我的通知
GET    /api/notifications/unread-count # 未读数量
POST   /api/notifications              # 发送通知 [管理员]
PUT    /api/notifications/:id/read     # 标记已读
DELETE /api/notifications/:id          # 删除通知
```

### 演唱会 API
```bash
GET    /api/concerts                   # 获取演唱会列表
GET    /api/concerts/:id               # 获取详情
POST   /api/concerts                   # 创建 [管理员]
PUT    /api/concerts/:id               # 更新 [管理员]
DELETE /api/concerts/:id               # 删除 [管理员]
```

### 行程 API
```bash
GET    /api/itineraries                # 我的行程
GET    /api/itineraries/:id            # 行程详情
POST   /api/itineraries                # 创建行程
PUT    /api/itineraries/:id            # 更新行程
DELETE /api/itineraries/:id            # 删除行程
```

---

## 🗂️ 数据库表速查

| 表名 | 说明 | 记录数 |
|------|------|--------|
| users | 用户 | 1+ |
| concerts | 演唱会 | 25 |
| itineraries | 行程 | - |
| messages | 留言 | - |
| orders | 订单 | - |
| favorites | 收藏 | - |
| **管理功能** | | |
| site_settings | 网站配置 | 22 |
| cms_contents | CMS内容 | 5 |
| notifications | 通知 | 4+ |
| admin_logs | 操作日志 | - |
| tags | 标签 | 14 |
| coupons | 优惠券 | - |
| feedbacks | 反馈 | - |
| banners | 轮播图 | - |
| login_records | 登录记录 | - |
| statistics | 统计数据 | - |

---

## 🛠️ 常见问题

### Q: 如何修改管理员密码？
```bash
1. 访问 http://localhost:3000/profile.html
2. 使用 admin/admin123 登录
3. 点击"修改密码"
```

### Q: 如何添加新配置？
```bash
1. 访问管理后台 → 网站配置
2. 手动在数据库中添加，或通过API
```

### Q: 如何备份数据库？
```bash
cp data/app.db data/app.db.backup.$(date +%Y%m%d)
```

### Q: 如何重置数据库？
```bash
rm data/app.db
node migrate.js
```

### Q: 服务器端口被占用怎么办？
```bash
# 修改 server.js 中的 PORT
const PORT = process.env.PORT || 3001;
```

---

## 📝 常用SQL查询

### 查看所有用户
```sql
SELECT id, username, email, role, created_at FROM users;
```

### 查看网站配置
```sql
SELECT setting_key, setting_value FROM site_settings WHERE is_public = 1;
```

### 查看未读通知数量
```sql
SELECT user_id, COUNT(*) as unread 
FROM notifications 
WHERE is_read = 0 
GROUP BY user_id;
```

### 查看热门演唱会
```sql
SELECT c.artist, c.city, COUNT(f.id) as fav_count
FROM concerts c
LEFT JOIN favorites f ON c.id = f.concert_id
GROUP BY c.id
ORDER BY fav_count DESC
LIMIT 10;
```

---

## 🎨 自定义配置

### 修改网站名称
```javascript
// 通过API
PUT /api/settings
{
  "updates": [
    {
      "setting_key": "site_name",
      "setting_value": "你的网站名称"
    }
  ]
}
```

### 修改主题色
```css
/* 编辑 public/css/common.css */
:root {
  --primary: #7C3AED;  /* 修改为你喜欢的颜色 */
}
```

---

## 📊 性能优化建议

### 1. 添加数据库索引
```sql
-- 已自动创建，无需手动添加
```

### 2. 启用缓存
```javascript
// 建议集成 Redis
```

### 3. CDN加速
```html
<!-- 静态资源使用CDN -->
```

---

## 🔒 安全建议

1. ✅ 修改默认管理员密码
2. ✅ 配置环境变量（JWT_SECRET）
3. ✅ 启用HTTPS
4. ✅ 定期备份数据库
5. ✅ 限制管理后台访问IP
6. ✅ 配置防火墙规则

---

## 📞 获取帮助

### 查看文档
```bash
docs/
├── database-design.md       # 数据库设计
├── migration-guide.md       # 迁移指南
├── PROJECT-SUMMARY.md       # 项目总结
├── API-FRONTEND-REPORT.md   # API报告
└── FINAL-SUMMARY.md         # 最终总结
```

### 常用脚本
```bash
node view-data.js     # 查看数据
node test-api.js      # 测试API
node migrate.js       # 重新迁移
```

---

**最后更新**：2026-07-20  
**版本**：v2.1
