/**
 * 数据库连接模块
 * 使用 better-sqlite3 同步 API
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'app.db'), {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null,
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
