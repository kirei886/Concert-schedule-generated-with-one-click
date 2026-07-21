-- ====================================
-- 演唱会行程生成器 - 网站管理表
-- 迁移版本: 0002
-- 创建日期: 2026-07-20
-- 数据库: Cloudflare D1 (SQLite)
-- ====================================

-- ====================================
-- 新增管理表
-- ====================================

-- 1. 网站配置表
CREATE TABLE IF NOT EXISTS site_settings (
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

CREATE INDEX IF NOT EXISTS idx_settings_key ON site_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON site_settings(category);

-- 2. 内容管理表
CREATE TABLE IF NOT EXISTS cms_contents (
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

CREATE INDEX IF NOT EXISTS idx_cms_slug ON cms_contents(slug);
CREATE INDEX IF NOT EXISTS idx_cms_status ON cms_contents(status);
CREATE INDEX IF NOT EXISTS idx_cms_category ON cms_contents(category);
CREATE INDEX IF NOT EXISTS idx_cms_author ON cms_contents(author_id);

-- 3. 轮播图/广告位表
CREATE TABLE IF NOT EXISTS banners (
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

CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_status ON banners(status);
CREATE INDEX IF NOT EXISTS idx_banners_order ON banners(display_order);

-- 4. 操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
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

CREATE INDEX IF NOT EXISTS idx_logs_user ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_module ON admin_logs(module);
CREATE INDEX IF NOT EXISTS idx_logs_created ON admin_logs(created_at);

-- 5. 通知表
CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);

-- 6. 标签表
CREATE TABLE IF NOT EXISTS tags (
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

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);

-- 标签关联表（多对多）
CREATE TABLE IF NOT EXISTS taggables (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id          INTEGER NOT NULL,
  taggable_type   TEXT NOT NULL,
  taggable_id     INTEGER NOT NULL,
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(tag_id, taggable_type, taggable_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_taggables_type ON taggables(taggable_type, taggable_id);

-- 7. 登录记录表
CREATE TABLE IF NOT EXISTS login_records (
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

CREATE INDEX IF NOT EXISTS idx_login_user ON login_records(user_id);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_records(login_ip);
CREATE INDEX IF NOT EXISTS idx_login_created ON login_records(created_at);

-- 8. 统计数据表
CREATE TABLE IF NOT EXISTS statistics (
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

CREATE INDEX IF NOT EXISTS idx_stats_date ON statistics(stat_date);
CREATE INDEX IF NOT EXISTS idx_stats_type ON statistics(metric_type);
CREATE INDEX IF NOT EXISTS idx_stats_dimension ON statistics(dimension);

-- 9. 反馈建议表
CREATE TABLE IF NOT EXISTS feedbacks (
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

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedbacks(feedback_type);

-- 10. 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
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

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);

-- 用户优惠券关联表
CREATE TABLE IF NOT EXISTS user_coupons (
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

CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_status ON user_coupons(status);
