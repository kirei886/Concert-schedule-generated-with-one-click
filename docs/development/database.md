# 演唱会行程生成器 - 数据库设计文档

> 版本：v2.0  
> 日期：2026-07-20  
> 数据库：Cloudflare D1 (SQLite)

---

## 📋 目录

1. [概述](#概述)
2. [现有表结构](#现有表结构)
3. [新增表结构](#新增表结构)
4. [迁移方案](#迁移方案)
5. [D1配置指南](#d1配置指南)
6. [代码改造指南](#代码改造指南)

---

## 概述

### 设计目标

- ✅ 完整的网站信息管理系统
- ✅ 支持内容管理（CMS）
- ✅ 用户通知系统
- ✅ 操作日志与审计
- ✅ 数据统计分析
- ✅ 优惠券营销系统

### 技术选型

- **数据库**: Cloudflare D1 (SQLite)
- **ORM**: 无（使用原生 SQL）
- **迁移工具**: Wrangler CLI
- **部署平台**: Cloudflare Workers

---

## 现有表结构

### 1. users（用户表）

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname      TEXT,
  avatar_url    TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  fan_color     TEXT DEFAULT '',
  fan_name      TEXT DEFAULT '',
  fan_slogan    TEXT DEFAULT '',
  role          TEXT DEFAULT 'user',
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  updated_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2. concerts（演唱会表）

```sql
CREATE TABLE concerts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist        TEXT NOT NULL,
  tour_name     TEXT,
  city          TEXT NOT NULL,
  venue         TEXT,
  concert_date  TEXT NOT NULL,
  start_time    TEXT DEFAULT '19:00',
  status        TEXT DEFAULT 'upcoming',
  tag           TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX idx_concerts_city ON concerts(city);
CREATE INDEX idx_concerts_artist ON concerts(artist);
CREATE INDEX idx_concerts_date ON concerts(concert_date);
CREATE INDEX idx_concerts_status ON concerts(status);
```

### 3. itineraries（行程表）

```sql
CREATE TABLE itineraries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  concert_id    INTEGER,
  title         TEXT,
  depart_city   TEXT,
  dest_city     TEXT,
  travel_date   TEXT,
  flight_info   TEXT DEFAULT '',
  train_info    TEXT DEFAULT '',
  bus_info      TEXT DEFAULT '',
  taxi_info     TEXT DEFAULT '',
  hotel_info    TEXT DEFAULT '',
  check_in      TEXT,
  check_out     TEXT,
  total_budget  REAL DEFAULT 0,
  notes         TEXT DEFAULT '',
  is_public     INTEGER DEFAULT 0,
  share_code    TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  updated_at    TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX idx_itineraries_user ON itineraries(user_id);
CREATE INDEX idx_itineraries_concert ON itineraries(concert_id);
CREATE INDEX idx_itineraries_share ON itineraries(share_code);
```

### 4. messages（留言表）

```sql
CREATE TABLE messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  parent_id     INTEGER DEFAULT NULL,
  concert_id    INTEGER DEFAULT NULL,
  artist        TEXT DEFAULT '',
  tag           TEXT DEFAULT '',
  content       TEXT NOT NULL,
  sticker       TEXT DEFAULT '',
  likes_count   INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_parent ON messages(parent_id);
CREATE INDEX idx_messages_concert ON messages(concert_id);
CREATE INDEX idx_messages_artist ON messages(artist);
```

### 5. message_likes（点赞记录表）

```sql
CREATE TABLE message_likes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id    INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_likes_msg ON message_likes(message_id);
CREATE INDEX idx_message_likes_user ON message_likes(user_id);
```

### 6. favorites（收藏表）

```sql
CREATE TABLE favorites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  concert_id    INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(user_id, concert_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_concert ON favorites(concert_id);
```

### 7. orders（订单表）

```sql
CREATE TABLE orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no        TEXT NOT NULL UNIQUE,
  user_id         INTEGER NOT NULL,
  itinerary_id    INTEGER,
  item_type       TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  item_detail     TEXT DEFAULT '',
  item_snapshot   TEXT DEFAULT '',
  quantity        INTEGER DEFAULT 1,
  unit_price      REAL NOT NULL DEFAULT 0,
  total_amount    REAL NOT NULL DEFAULT 0,
  contact_name    TEXT DEFAULT '',
  contact_phone   TEXT DEFAULT '',
  travel_date     TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending',
  pay_method      TEXT DEFAULT '',
  paid_at         TEXT DEFAULT NULL,
  refund_reason   TEXT DEFAULT '',
  refunded_at     TEXT DEFAULT NULL,
  platform_order_no TEXT DEFAULT '',
  pay_url         TEXT DEFAULT '',
  offer_id        TEXT DEFAULT '',
  platform_status TEXT DEFAULT '',
  callback_data   TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_no ON orders(order_no);
CREATE INDEX idx_orders_itinerary ON orders(itinerary_id);
CREATE INDEX idx_orders_platform ON orders(platform_order_no);
```

---

## 新增表结构

### 1. site_settings（网站配置表）

```sql
CREATE TABLE site_settings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key     TEXT NOT NULL UNIQUE,
  setting_value   TEXT NOT NULL,
  setting_type    TEXT DEFAULT 'text',
  category        TEXT DEFAULT 'general',
  description     TEXT DEFAULT '',
  is_public       INTEGER DEFAULT 0,
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_by      INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_settings_key ON site_settings(setting_key);
CREATE INDEX idx_settings_category ON site_settings(category);
```

**默认配置数据**：

```sql
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, is_public, description) VALUES
('site_name', '演唱会行程生成器', 'text', 'general', 1, '网站名称'),
('site_description', '一键生成演唱会全链路行程', 'text', 'general', 1, '网站描述'),
('site_logo', '/images/logo.png', 'image', 'general', 1, '网站Logo'),
('site_keywords', '演唱会,行程生成,追星,机票,酒店', 'text', 'seo', 1, 'SEO关键词'),
('enable_register', 'true', 'boolean', 'general', 1, '是否开放注册'),
('enable_messages', 'true', 'boolean', 'general', 1, '是否开放留言板'),
('maintenance_mode', 'false', 'boolean', 'general', 0, '维护模式'),
('max_itinerary_per_user', '50', 'number', 'general', 0, '每个用户最多行程数'),
('longxia_token', 'rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk', 'text', 'third_party', 0, '龙虾出行API Token'),
('amap_key', '', 'text', 'third_party', 0, '高德地图API Key');
```

### 2. cms_contents（内容管理表）

```sql
CREATE TABLE cms_contents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  content         TEXT NOT NULL,
  content_type    TEXT DEFAULT 'markdown',
  category        TEXT DEFAULT 'page',
  excerpt         TEXT DEFAULT '',
  cover_image     TEXT DEFAULT '',
  status          TEXT DEFAULT 'draft',
  seo_title       TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  seo_keywords    TEXT DEFAULT '',
  view_count      INTEGER DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  is_featured     INTEGER DEFAULT 0,
  author_id       INTEGER NOT NULL,
  published_at    TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_cms_slug ON cms_contents(slug);
CREATE INDEX idx_cms_status ON cms_contents(status);
CREATE INDEX idx_cms_category ON cms_contents(category);
CREATE INDEX idx_cms_author ON cms_contents(author_id);
```

**默认内容页面**：

```sql
INSERT INTO cms_contents (title, slug, content, content_type, category, status, author_id, published_at) VALUES
('关于我们', 'about', '# 关于我们\n\n演唱会行程生成器致力于为追星族提供便捷的行程规划服务...', 'markdown', 'page', 'published', 1, datetime('now','localtime')),
('使用帮助', 'help', '# 使用帮助\n\n## 如何使用\n1. 输入演出信息\n2. 点击生成行程...', 'markdown', 'page', 'published', 1, datetime('now','localtime')),
('隐私政策', 'privacy', '# 隐私政策\n\n我们重视您的隐私...', 'markdown', 'page', 'published', 1, datetime('now','localtime')),
('用户协议', 'terms', '# 用户服务协议\n\n请仔细阅读以下条款...', 'markdown', 'page', 'published', 1, datetime('now','localtime'));
```

### 3. banners（轮播图/广告位表）

```sql
CREATE TABLE banners (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  subtitle        TEXT DEFAULT '',
  image_url       TEXT NOT NULL,
  link_url        TEXT DEFAULT '',
  link_target     TEXT DEFAULT '_self',
  position        TEXT DEFAULT 'home_hero',
  display_order   INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',
  start_date      TEXT DEFAULT NULL,
  end_date        TEXT DEFAULT NULL,
  click_count     INTEGER DEFAULT 0,
  created_by      INTEGER,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_status ON banners(status);
CREATE INDEX idx_banners_order ON banners(display_order);
```

### 4. admin_logs（操作日志表）

```sql
CREATE TABLE admin_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  action          TEXT NOT NULL,
  module          TEXT NOT NULL,
  target_type     TEXT DEFAULT '',
  target_id       INTEGER DEFAULT NULL,
  description     TEXT DEFAULT '',
  request_method  TEXT DEFAULT '',
  request_url     TEXT DEFAULT '',
  request_ip      TEXT DEFAULT '',
  request_params  TEXT DEFAULT '',
  response_status INTEGER DEFAULT NULL,
  error_message   TEXT DEFAULT '',
  execution_time  INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_logs_user ON admin_logs(user_id);
CREATE INDEX idx_logs_action ON admin_logs(action);
CREATE INDEX idx_logs_module ON admin_logs(module);
CREATE INDEX idx_logs_created ON admin_logs(created_at);
```

### 5. notifications（通知表）

```sql
CREATE TABLE notifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  link_url        TEXT DEFAULT '',
  is_read         INTEGER DEFAULT 0,
  sender_id       INTEGER DEFAULT NULL,
  related_type    TEXT DEFAULT '',
  related_id      INTEGER DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  read_at         TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);
CREATE INDEX idx_notif_created ON notifications(created_at);
```

### 6. tags（标签表）

```sql
CREATE TABLE tags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  color           TEXT DEFAULT '#7C3AED',
  icon            TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  usage_count     INTEGER DEFAULT 0,
  category        TEXT DEFAULT 'general',
  is_featured     INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE taggables (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id          INTEGER NOT NULL,
  taggable_type   TEXT NOT NULL,
  taggable_id     INTEGER NOT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(tag_id, taggable_type, taggable_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX idx_taggables_type ON taggables(taggable_type, taggable_id);
```

### 7. login_records（登录记录表）

```sql
CREATE TABLE login_records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  login_type      TEXT DEFAULT 'password',
  login_ip        TEXT NOT NULL,
  login_device    TEXT DEFAULT '',
  login_location  TEXT DEFAULT '',
  user_agent      TEXT DEFAULT '',
  status          TEXT DEFAULT 'success',
  fail_reason     TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_login_user ON login_records(user_id);
CREATE INDEX idx_login_ip ON login_records(login_ip);
CREATE INDEX idx_login_created ON login_records(created_at);
```

### 8. statistics（统计数据表）

```sql
CREATE TABLE statistics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_date       TEXT NOT NULL,
  metric_type     TEXT NOT NULL,
  metric_value    REAL NOT NULL DEFAULT 0,
  dimension       TEXT DEFAULT '',
  dimension_value TEXT DEFAULT '',
  extra_data      TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(stat_date, metric_type, dimension, dimension_value)
);

CREATE INDEX idx_stats_date ON statistics(stat_date);
CREATE INDEX idx_stats_type ON statistics(metric_type);
CREATE INDEX idx_stats_dimension ON statistics(dimension);
```

### 9. feedbacks（反馈建议表）

```sql
CREATE TABLE feedbacks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER DEFAULT NULL,
  contact_email   TEXT DEFAULT '',
  feedback_type   TEXT DEFAULT 'suggestion',
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  images          TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending',
  priority        TEXT DEFAULT 'normal',
  admin_reply     TEXT DEFAULT '',
  replied_by      INTEGER DEFAULT NULL,
  replied_at      TEXT DEFAULT NULL,
  resolved_at     TEXT DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (replied_by) REFERENCES users(id)
);

CREATE INDEX idx_feedback_user ON feedbacks(user_id);
CREATE INDEX idx_feedback_status ON feedbacks(status);
CREATE INDEX idx_feedback_type ON feedbacks(feedback_type);
```

### 10. coupons（优惠券表）

```sql
CREATE TABLE coupons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  coupon_type     TEXT DEFAULT 'discount',
  discount_value  REAL NOT NULL DEFAULT 0,
  min_amount      REAL DEFAULT 0,
  max_discount    REAL DEFAULT 0,
  total_quantity  INTEGER DEFAULT 0,
  used_quantity   INTEGER DEFAULT 0,
  valid_from      TEXT NOT NULL,
  valid_to        TEXT NOT NULL,
  applicable_to   TEXT DEFAULT 'all',
  status          TEXT DEFAULT 'active',
  created_by      INTEGER,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE user_coupons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  coupon_id       INTEGER NOT NULL,
  status          TEXT DEFAULT 'unused',
  used_at         TEXT DEFAULT NULL,
  order_id        INTEGER DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
```

---

## 迁移方案

### 方案选择

**推荐：分步迁移（混合方案）**

```
阶段一：核心迁移（3-4天）
├── 完成数据库设计文档 ✅
├── 创建D1数据库
├── 迁移现有7张表
└── 核心代码改造

阶段二：管理功能（4-5天）
├── 新增基础管理表（settings/logs/notifications）
├── API开发
└── 简单管理后台

阶段三：增强功能（5-7天，可选）
├── CMS系统
├── 优惠券系统
└── 统计报表
```

---

## D1配置指南

### 步骤1：安装Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 步骤2：创建D1数据库

```bash
# 创建数据库
wrangler d1 create concert-itinerary-db

# 输出示例：
# ✅ Successfully created DB 'concert-itinerary-db'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "concert-itinerary-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 步骤3：配置wrangler.toml

在项目根目录创建 `wrangler.toml`:

```toml
name = "concert-itinerary"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "concert-itinerary-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 步骤4：执行数据库迁移

```bash
# 创建迁移文件
mkdir -p migrations

# 执行迁移（本地）
wrangler d1 execute concert-itinerary-db --local --file=./migrations/0001_initial.sql

# 执行迁移（生产）
wrangler d1 execute concert-itinerary-db --remote --file=./migrations/0001_initial.sql
```

---

## 代码改造指南

### 核心改动：同步 → 异步

#### 原代码（better-sqlite3）

```javascript
// src/routes/auth.js
const db = require('../db');

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 同步查询
  const user = db.prepare('SELECT * FROM users WHERE username = ?')
    .get(username);
  
  if (!user) {
    return res.json({ code: 40001, message: '用户不存在' });
  }
  
  // 验证密码...
});
```

#### 新代码（D1）

```javascript
// src/routes/auth.js
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // 异步查询
  const user = await req.env.DB.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  
  if (!user) {
    return res.json({ code: 40001, message: '用户不存在' });
  }
  
  // 验证密码...
});
```

### D1 API速查表

| 操作 | better-sqlite3 | Cloudflare D1 |
|------|----------------|---------------|
| **查询单行** | `.get()` | `.first()` |
| **查询多行** | `.all()` | `.all()` |
| **执行语句** | `.run()` | `.run()` |
| **绑定参数** | 直接传参 | `.bind(p1, p2)` |
| **事务** | `db.transaction()` | `db.batch([])` |

### 封装D1访问层

创建 `src/db-d1.js`:

```javascript
/**
 * D1数据库访问层封装
 */
class D1Helper {
  constructor(db) {
    this.db = db;
  }

  async get(sql, ...params) {
    return await this.db.prepare(sql).bind(...params).first();
  }

  async all(sql, ...params) {
    const result = await this.db.prepare(sql).bind(...params).all();
    return result.results || [];
  }

  async run(sql, ...params) {
    return await this.db.prepare(sql).bind(...params).run();
  }

  async batch(statements) {
    return await this.db.batch(statements);
  }
}

module.exports = D1Helper;
```

---

## 总结

### 表结构统计

| 类别 | 表数量 | 表名 |
|------|--------|------|
| **现有表** | 7 | users, concerts, itineraries, messages, message_likes, favorites, orders |
| **新增表** | 10 | site_settings, cms_contents, banners, admin_logs, notifications, tags, taggables, login_records, statistics, feedbacks, coupons, user_coupons |
| **总计** | 17 | - |

### 下一步行动

1. ✅ 阅读本文档
2. ⏭️ 创建D1数据库
3. ⏭️ 执行建表SQL
4. ⏭️ 开始代码改造

---

**文档版本**: v2.0  
**最后更新**: 2026-07-20  
**维护人**: Development Team
