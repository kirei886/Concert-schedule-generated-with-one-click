/**
 * 数据库初始化脚本
 * 首次运行自动建表 + 导入初始演唱会数据
 */
const db = require('./db');
const fs = require('fs');
const path = require('path');

function initDatabase() {
  console.log('[DB] 开始初始化数据库...');

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS message_likes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id    INTEGER NOT NULL,
      user_id       INTEGER NOT NULL,
      created_at    TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      concert_id    INTEGER NOT NULL,
      created_at    TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, concert_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no        TEXT NOT NULL UNIQUE,
      user_id         INTEGER NOT NULL,
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
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_concerts_city ON concerts(city);
    CREATE INDEX IF NOT EXISTS idx_concerts_artist ON concerts(artist);
    CREATE INDEX IF NOT EXISTS idx_concerts_date ON concerts(concert_date);
    CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id);
    CREATE INDEX IF NOT EXISTS idx_itineraries_share ON itineraries(share_code);
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
    CREATE INDEX IF NOT EXISTS idx_message_likes_msg ON message_likes(message_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
  `);

  // ====== 迁移：orders 表新增 itinerary_id 列，关联自动创建的行程 ======
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN itinerary_id INTEGER").run();
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_itinerary ON orders(itinerary_id)');
    console.log('[DB] orders 表已新增 itinerary_id 列');
  } catch (e) {
    // 列已存在，忽略
  }

  // ====== 迁移：orders 表新增龙虾平台订单相关字段 ======
  const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  const addOrderCol = (sql, name) => {
    if (orderCols.includes(name)) return;
    try { db.exec(sql); console.log(`[DB] orders 表新增 ${name} 列`); }
    catch (e) { console.log(`[DB] orders 表添加 ${name} 列失败:`, e.message); }
  };
  addOrderCol("ALTER TABLE orders ADD COLUMN platform_order_no TEXT DEFAULT ''", 'platform_order_no');
  addOrderCol("ALTER TABLE orders ADD COLUMN pay_url TEXT DEFAULT ''", 'pay_url');
  addOrderCol("ALTER TABLE orders ADD COLUMN offer_id TEXT DEFAULT ''", 'offer_id');
  addOrderCol("ALTER TABLE orders ADD COLUMN platform_status TEXT DEFAULT ''", 'platform_status');
  addOrderCol("ALTER TABLE orders ADD COLUMN callback_data TEXT DEFAULT ''", 'callback_data');

  // ====== 迁移：orders 表新增龙虾机票相关字段 ======
  addOrderCol("ALTER TABLE orders ADD COLUMN longxia_order_no TEXT DEFAULT ''", 'longxia_order_no');
  addOrderCol("ALTER TABLE orders ADD COLUMN pnr TEXT DEFAULT ''", 'pnr');
  addOrderCol("ALTER TABLE orders ADD COLUMN flight_no TEXT DEFAULT ''", 'flight_no');
  addOrderCol("ALTER TABLE orders ADD COLUMN departure_time TEXT DEFAULT ''", 'departure_time');
  addOrderCol("ALTER TABLE orders ADD COLUMN arrival_time TEXT DEFAULT ''", 'arrival_time');
  addOrderCol("ALTER TABLE orders ADD COLUMN passenger_name TEXT DEFAULT ''", 'passenger_name');
  addOrderCol("ALTER TABLE orders ADD COLUMN passenger_id_card TEXT DEFAULT ''", 'passenger_id_card');
  addOrderCol("ALTER TABLE orders ADD COLUMN passenger_phone TEXT DEFAULT ''", 'passenger_phone');
  addOrderCol("ALTER TABLE orders ADD COLUMN search_offer_id TEXT DEFAULT ''", 'search_offer_id');

  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_platform ON orders(platform_order_no)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_offer ON orders(offer_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_longxia ON orders(longxia_order_no)');

  // 兼容老库：逐列添加，任意一列已存在不影响其余
  const msgCols = db.prepare("PRAGMA table_info(messages)").all().map(c => c.name);
  const addMsgCol = (sql, name) => {
    if (msgCols.includes(name)) return;
    try { db.exec(sql); console.log(`[DB] messages 表新增 ${name} 列`); }
    catch (e) { console.log(`[DB] messages 表添加 ${name} 列失败:`, e.message); }
  };
  addMsgCol("ALTER TABLE messages ADD COLUMN concert_id INTEGER", 'concert_id');
  addMsgCol("ALTER TABLE messages ADD COLUMN artist TEXT DEFAULT ''", 'artist');
  addMsgCol("ALTER TABLE messages ADD COLUMN tag TEXT DEFAULT ''", 'tag');
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_concert ON messages(concert_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_artist ON messages(artist)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_tag ON messages(tag)');

  console.log('[DB] 表结构创建完成');

  const count = db.prepare('SELECT COUNT(*) as c FROM concerts').get();
  if (count.c === 0) {
    const jsonPath = path.join(__dirname, '..', 'public', 'hot-concerts.json');
    if (fs.existsSync(jsonPath)) {
      const concerts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];
      const insert = db.prepare(`
        INSERT INTO concerts (artist, tour_name, city, venue, concert_date, start_time, status, tag)
        VALUES (@artist, @tour, @city, @venue, @date, '19:00',
          CASE WHEN @date < ? THEN 'finished'
               WHEN @tag = '已开唱' THEN 'finished'
               WHEN @tag = '即将开唱' THEN 'upcoming'
               ELSE 'selling' END,
          CASE WHEN @date < ? THEN '已结束' ELSE @tag END)
      `);
      const insertMany = db.transaction((items, todayVal) => {
        for (const c of items) {
          insert.run(todayVal, todayVal, c);
        }
      });
      insertMany(concerts, today);
      console.log(`[DB] 导入了 ${concerts.length} 条演唱会数据`);
    }
  }

  // ====== 预置 admin 账号 ======
  const bcrypt = require('bcryptjs');
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, nickname, role, fan_color, fan_name, fan_slogan)
      VALUES ('admin', 'admin@concert.local', ?, '管理员', 'admin', '#FF6B6B', 'Admin', '全场我最美')
    `).run(hash);
    console.log('[DB] 预置 admin 账号已创建 (用户名: admin, 密码: admin123)');
  }

  // ====== 检查表是否有 taxi_info 列，没有则添加 ======
  const taxiCol = db.prepare("PRAGMA table_info(itineraries)").all().find(c => c.name === 'taxi_info');
  if (!taxiCol) {
    try {
      db.exec("ALTER TABLE itineraries ADD COLUMN taxi_info TEXT DEFAULT ''");
      console.log('[DB] 已为 itineraries 表添加 taxi_info 列');
    } catch (e) {
      console.log('[DB] 添加 taxi_info 列失败（可能已存在）:', e.message);
    }
  }

  // ====== 数据修复：重算历史行程的预算总额 ======
  // 旧版 saveItinerary 读取了错误的 price 字段，导致 total_budget 被写成 0。
  // 这里遍历 total_budget=0 的行程，从 flight/train/bus/taxi/hotel 的 JSON 快照中
  // 提取价格重新累加，修正历史数据。
  try {
    const zeroBudgetTrips = db.prepare("SELECT id, flight_info, train_info, bus_info, taxi_info, hotel_info FROM itineraries WHERE total_budget = 0").all();
    let fixed = 0;
    const extractPrice = (infoStr) => {
      if (!infoStr) return 0;
      try {
        const obj = JSON.parse(infoStr);
        // 优先用统一规整后的 _price 字段，缺失时回退到原始来源字段
        const p = obj._price != null ? obj._price
          : obj.price != null ? obj.price
          : obj.min_price != null ? obj.min_price
          : obj.estimated_price != null ? obj.estimated_price
          : obj.adult_price != null ? obj.adult_price
          : null;
        return p != null ? (parseFloat(p) || 0) : 0;
      } catch { return 0; }
    };
    for (const trip of zeroBudgetTrips) {
      const sum = extractPrice(trip.flight_info) + extractPrice(trip.train_info)
        + extractPrice(trip.bus_info) + extractPrice(trip.taxi_info) + extractPrice(trip.hotel_info);
      if (sum > 0) {
        db.prepare("UPDATE itineraries SET total_budget = ? WHERE id = ?").run(sum, trip.id);
        fixed++;
      }
    }
    if (fixed > 0) console.log(`[DB] 已修正 ${fixed} 条历史行程的预算总额（原为 0）`);
  } catch (e) {
    console.log('[DB] 重算历史行程预算失败:', e.message);
  }

  console.log('[DB] 数据库初始化完成');
}

module.exports = { initDatabase };
