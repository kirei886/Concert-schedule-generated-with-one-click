-- ====================================
-- 演唱会行程生成器 - 初始表结构
-- 迁移版本: 0001
-- 创建日期: 2026-07-20
-- 数据库: Cloudflare D1 (SQLite)
-- ====================================

-- ====================================
-- 现有核心表
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
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  updated_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

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
  created_at    TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_concerts_city ON concerts(city);
CREATE INDEX IF NOT EXISTS idx_concerts_artist ON concerts(artist);
CREATE INDEX IF NOT EXISTS idx_concerts_date ON concerts(concert_date);
CREATE INDEX IF NOT EXISTS idx_concerts_status ON concerts(status);

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
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  updated_at    TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_concert ON itineraries(concert_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_share ON itineraries(share_code);

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
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_concert ON messages(concert_id);
CREATE INDEX IF NOT EXISTS idx_messages_artist ON messages(artist);

-- 5. 点赞记录表
CREATE TABLE IF NOT EXISTS message_likes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id    INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_likes_msg ON message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user ON message_likes(user_id);

-- 6. 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  concert_id    INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(user_id, concert_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_concert ON favorites(concert_id);

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
  created_at      TEXT DEFAULT (datetime('now','localtime')),
  updated_at      TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_itinerary ON orders(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_orders_platform ON orders(platform_order_no);
