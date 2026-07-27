# 数据库迁移执行指南

## 📋 迁移文件清单

```
migrations/
├── 0001_initial_tables.sql      # 现有核心表（7张）
├── 0002_management_tables.sql   # 新增管理表（10张）
└── 0003_seed_data.sql           # 初始数据
```

---

## 🚀 执行方式

### 方案 A：使用 Cloudflare D1（推荐，适合生产环境）

#### 步骤 1：安装 Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

#### 步骤 2：创建 D1 数据库

```bash
wrangler d1 create concert-itinerary-db
```

输出示例：
```
✅ Successfully created DB 'concert-itinerary-db'

[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### 步骤 3：配置 wrangler.toml

在项目根目录创建 `wrangler.toml`：

```toml
name = "concert-itinerary"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "你的数据库ID"
```

#### 步骤 4：执行迁移（本地测试）

```bash
# 执行第一个迁移
wrangler d1 execute concert-itinerary-db --local --file=./migrations/0001_initial_tables.sql

# 执行第二个迁移
wrangler d1 execute concert-itinerary-db --local --file=./migrations/0002_management_tables.sql

# 执行第三个迁移（插入数据）
wrangler d1 execute concert-itinerary-db --local --file=./migrations/0003_seed_data.sql
```

#### 步骤 5：执行迁移（生产环境）

```bash
# 将 --local 改为 --remote
wrangler d1 execute concert-itinerary-db --remote --file=./migrations/0001_initial_tables.sql
wrangler d1 execute concert-itinerary-db --remote --file=./migrations/0002_management_tables.sql
wrangler d1 execute concert-itinerary-db --remote --file=./migrations/0003_seed_data.sql
```

---

### 方案 B：继续使用本地 SQLite（适合开发测试）

#### 步骤 1：执行迁移脚本

```bash
# 进入项目目录
cd 111

# 执行所有迁移
sqlite3 data/app.db < migrations/0001_initial_tables.sql
sqlite3 data/app.db < migrations/0002_management_tables.sql
sqlite3 data/app.db < migrations/0003_seed_data.sql
```

#### 步骤 2：验证表结构

```bash
# 查看所有表
sqlite3 data/app.db ".tables"

# 查看表结构
sqlite3 data/app.db ".schema site_settings"
```

---

## ✅ 验证迁移结果

### 检查表是否创建成功

```sql
-- 查看所有表
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- 应该看到以下17张表：
-- users, concerts, itineraries, messages, message_likes, favorites, orders
-- site_settings, cms_contents, banners, admin_logs, notifications
-- tags, taggables, login_records, statistics, feedbacks, coupons, user_coupons
```

### 检查默认数据

```sql
-- 检查网站配置
SELECT setting_key, setting_value FROM site_settings LIMIT 5;

-- 检查管理员账号
SELECT username, email, role FROM users WHERE role = 'admin';

-- 检查CMS内容页
SELECT title, slug, status FROM cms_contents;

-- 检查标签
SELECT name, category FROM tags;
```

---

## 🔄 回滚方案

如果需要回滚（删除所有表）：

```sql
-- 删除所有新增表
DROP TABLE IF EXISTS user_coupons;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS feedbacks;
DROP TABLE IF EXISTS statistics;
DROP TABLE IF EXISTS login_records;
DROP TABLE IF EXISTS taggables;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS banners;
DROP TABLE IF EXISTS cms_contents;
DROP TABLE IF EXISTS site_settings;

-- 如果需要完全重置（包括核心表）
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS message_likes;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS itineraries;
DROP TABLE IF EXISTS concerts;
DROP TABLE IF EXISTS users;
```

---

## 📊 数据统计

### 迁移后的数据库结构

| 类别 | 表数量 | 说明 |
|------|--------|------|
| 核心业务表 | 7 | users, concerts, itineraries, messages, message_likes, favorites, orders |
| 内容管理表 | 3 | site_settings, cms_contents, banners |
| 系统管理表 | 4 | admin_logs, notifications, login_records, statistics |
| 扩展功能表 | 4 | tags, taggables, feedbacks, coupons, user_coupons |
| **总计** | **17** | - |

### 初始数据

- 网站配置：17 条
- 管理员账号：1 个（admin/admin123）
- CMS内容页：5 页（关于我们、帮助、隐私、协议、FAQ）
- 标签：14 个
- 通知：2 条

---

## 🛠️ 下一步工作

迁移完成后，需要：

1. ✅ 修改管理员默认密码
2. ⏭️ 配置网站信息（名称、Logo等）
3. ⏭️ 开发管理后台API
4. ⏭️ 开发管理后台前端页面
5. ⏭️ 代码改造（SQLite → D1）

---

## 📝 注意事项

### 安全提示

⚠️ **重要**：默认管理员密码为 `admin123`，部署前务必修改！

### D1 限制

- 免费版：500MB存储，每天10万写入
- 单个查询超时：30秒
- 批量操作：最多500条

### 数据迁移

如果已有数据，需要先导出：

```bash
# 导出现有数据
sqlite3 data/app.db .dump > backup.sql

# 导入到新数据库
sqlite3 new_data/app.db < backup.sql
```

---

**文档版本**: v1.0  
**创建日期**: 2026-07-20  
**适用版本**: 演唱会行程生成器 v2.0
