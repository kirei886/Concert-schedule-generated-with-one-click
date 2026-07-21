/**
 * 演唱会行程生成器 - Express 服务器入口
 * 整合数据库、路由、中间件、静态文件服务
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./src/init-db');
const { startAutoFinishSchedule } = require('./src/auto-finish-concerts');
const { authOptional } = require('./src/middleware/auth');
const { errorHandler, notFound } = require('./src/middleware/error');

const authRoutes = require('./src/routes/auth');
const concertRoutes = require('./src/routes/concerts');
const itineraryRoutes = require('./src/routes/itineraries');
const messageRoutes = require('./src/routes/messages');
const favoriteRoutes = require('./src/routes/favorites');
const orderRoutes = require('./src/routes/orders');
const proxyRoutes = require('./src/routes/proxy');
const settingsRoutes = require('./src/routes/settings');
const notificationsRoutes = require('./src/routes/notifications');
const cmsRoutes = require('./src/routes/cms');

const PORT = process.env.PORT || 3000;

initDatabase();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
}));

app.use('/api/auth', authRoutes);
app.use('/api/concerts', authOptional, concertRoutes);
app.use('/api/itineraries', itineraryRoutes);
app.use('/api/messages', authOptional, messageRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/cms', authOptional, cmsRoutes);
app.use('/api', proxyRoutes);

// 使用 authOptional 以便登录用户能看到自己是否已收藏该演唱会
app.get('/api/hot-concerts', authOptional, (req, res) => {
  const db = require('./src/db');
  const today = new Date().toISOString().split('T')[0];
  let concerts = db.prepare(`
    SELECT * FROM concerts WHERE concert_date >= ? AND status != 'finished' ORDER BY concert_date ASC
  `).all(today);
  for (let i = concerts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [concerts[i], concerts[j]] = [concerts[j], concerts[i]];
  }
  concerts = concerts.slice(0, 15);
  // 已登录用户：附加收藏状态，供前端心形按钮正确显示
  if (req.user) {
    const favIds = new Set(db.prepare('SELECT concert_id FROM favorites WHERE user_id = ?')
      .all(req.user.id).map(r => r.concert_id));
    for (const c of concerts) c.is_favorited = favIds.has(c.id);
  }
  res.json({ code: 0, data: concerts });
});

app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html',
  extensions: ['html'],
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return notFound(req, res);
  }
  const fs = require('fs');
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  演唱会行程生成器服务已启动!');
  console.log('  访问地址: http://localhost:' + PORT);
  console.log('  数据库: SQLite (data/app.db)');
  console.log('========================================');

  // 启动过期演唱会自动同步定时任务
  startAutoFinishSchedule();
});
