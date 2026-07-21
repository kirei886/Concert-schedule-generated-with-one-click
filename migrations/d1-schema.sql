-- Cloudflare D1 数据库初始化脚本
-- 合并所有表结构到一个文件

-- ====================================
-- 核心业务表
-- ====================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
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
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 2. 演唱会表
CREATE TABLE IF NOT EXISTS concerts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist        TEXT NOT NULL,
  tour_name     TEXT,
  city          TEXT NOT NULL,
  venue         TEXT,
  concert_date  TEXT NOT NULL,
  start_time    TEXT DEFAULT '19:00',
  status        TEXT DEFAULT 'upcoming',
  tag           TEXT DEFAULT '',
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_concerts_city ON concerts(city);
CREATE INDEX idx_concerts_artist ON concerts(artist);
CREATE INDEX idx_concerts_date ON concerts(concert_date);
CREATE INDEX idx_concerts_status ON concerts(status);

-- 3. 行程表
CREATE TABLE IF NOT EXISTS itineraries (
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
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX idx_itineraries_user ON itineraries(user_id);
CREATE INDEX idx_itineraries_concert ON itineraries(concert_id);
CREATE INDEX idx_itineraries_share ON itineraries(share_code);

-- 4. 留言表
CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  parent_id     INTEGER DEFAULT NULL,
  concert_id    INTEGER DEFAULT NULL,
  artist        TEXT DEFAULT '',
  tag           TEXT DEFAULT '',
  content       TEXT NOT NULL,
  sticker       TEXT DEFAULT '',
  likes_count   INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_parent ON messages(parent_id);
CREATE INDEX idx_messages_concert ON messages(concert_id);

-- 5. 点赞记录表
CREATE TABLE IF NOT EXISTS message_likes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id    INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_likes_msg ON message_likes(message_id);
CREATE INDEX idx_message_likes_user ON message_likes(user_id);

-- 6. 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  concert_id    INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, concert_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_concert ON favorites(concert_id);

-- 7. 订单表
CREATE TABLE IF NOT EXISTS orders (
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
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_no ON orders(order_no);

-- ====================================
-- 管理功能表
-- ====================================

-- 8. 网站配置表
CREATE TABLE IF NOT EXISTS site_settings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key     TEXT NOT NULL UNIQUE,
  setting_value   TEXT NOT NULL,
  setting_type    TEXT DEFAULT 'text',
  category        TEXT DEFAULT 'general',
  description     TEXT DEFAULT '',
  is_public       INTEGER DEFAULT 0,
  updated_at      TEXT DEFAULT (datetime('now')),
  updated_by      INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_settings_key ON site_settings(setting_key);
CREATE INDEX idx_settings_category ON site_settings(category);

-- 9. CMS内容表
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
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_cms_slug ON cms_contents(slug);
CREATE INDEX idx_cms_status ON cms_contents(status);

-- 10. 轮播图表
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
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_status ON banners(status);

-- 11. 操作日志表
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
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_logs_user ON admin_logs(user_id);
CREATE INDEX idx_logs_action ON admin_logs(action);

-- 12. 通知表
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
  created_at      TEXT DEFAULT (datetime('now')),
  read_at         TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);

-- 13. 标签表
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
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_tags_slug ON tags(slug);

-- 14. 标签关联表
CREATE TABLE IF NOT EXISTS taggables (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id          INTEGER NOT NULL,
  taggable_type   TEXT NOT NULL,
  taggable_id     INTEGER NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(tag_id, taggable_type, taggable_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_taggables_type ON taggables(taggable_type, taggable_id);

-- 15. 登录记录表
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
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_login_user ON login_records(user_id);

-- 16. 统计数据表
CREATE TABLE IF NOT EXISTS statistics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_date       TEXT NOT NULL,
  metric_type     TEXT NOT NULL,
  metric_value    REAL NOT NULL DEFAULT 0,
  dimension       TEXT DEFAULT '',
  dimension_value TEXT DEFAULT '',
  extra_data      TEXT DEFAULT '',
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(stat_date, metric_type, dimension, dimension_value)
);

CREATE INDEX idx_stats_date ON statistics(stat_date);

-- 17. 反馈表
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
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (replied_by) REFERENCES users(id)
);

CREATE INDEX idx_feedback_status ON feedbacks(status);

-- 18. 优惠券表
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
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_coupons_code ON coupons(code);

-- 19. 用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  coupon_id       INTEGER NOT NULL,
  status          TEXT DEFAULT 'unused',
  used_at         TEXT DEFAULT NULL,
  order_id        INTEGER DEFAULT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_user_coupons_user ON user_coupons(user_id);
