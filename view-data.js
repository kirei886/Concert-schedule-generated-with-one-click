/**
 * 数据库查询工具
 * 快速查看数据库中的数据
 */
const db = require('./src/db');

console.log('========================================');
console.log('📊 数据库数据查看工具');
console.log('========================================\n');

// 1. 网站配置
console.log('【1】网站配置（前10条）');
console.log('─────────────────────────────────────');
const settings = db.prepare('SELECT setting_key, setting_value, category FROM site_settings LIMIT 10').all();
settings.forEach(s => {
  console.log(`  ${s.setting_key.padEnd(25)} = ${s.setting_value.substring(0, 40)}`);
});

// 2. CMS内容页
console.log('\n【2】CMS内容页');
console.log('─────────────────────────────────────');
const cms = db.prepare('SELECT title, slug, status FROM cms_contents').all();
cms.forEach(c => {
  console.log(`  [${c.status}] ${c.title.padEnd(20)} (/${c.slug})`);
});

// 3. 标签
console.log('\n【3】标签系统');
console.log('─────────────────────────────────────');
const tags = db.prepare('SELECT name, category, color FROM tags').all();
const tagsByCategory = {};
tags.forEach(t => {
  if (!tagsByCategory[t.category]) tagsByCategory[t.category] = [];
  tagsByCategory[t.category].push(t.name);
});
Object.entries(tagsByCategory).forEach(([cat, names]) => {
  console.log(`  ${cat.padEnd(10)}: ${names.join(', ')}`);
});

// 4. 用户统计
console.log('\n【4】用户统计');
console.log('─────────────────────────────────────');
const userStats = db.prepare(`
  SELECT
    role,
    COUNT(*) as count
  FROM users
  GROUP BY role
`).all();
userStats.forEach(s => {
  console.log(`  ${s.role.padEnd(10)}: ${s.count} 人`);
});

// 5. 演唱会统计
console.log('\n【5】演唱会统计');
console.log('─────────────────────────────────────');
const concertStats = db.prepare(`
  SELECT
    status,
    COUNT(*) as count
  FROM concerts
  GROUP BY status
`).all();
concertStats.forEach(s => {
  console.log(`  ${s.status.padEnd(15)}: ${s.count} 场`);
});

// 6. 行程统计
console.log('\n【6】行程统计');
console.log('─────────────────────────────────────');
const itineraryCount = db.prepare('SELECT COUNT(*) as count FROM itineraries').get();
const publicCount = db.prepare('SELECT COUNT(*) as count FROM itineraries WHERE is_public = 1').get();
console.log(`  总行程数: ${itineraryCount.count}`);
console.log(`  公开行程: ${publicCount.count}`);

// 7. 留言统计
console.log('\n【7】留言统计');
console.log('─────────────────────────────────────');
const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
const likeCount = db.prepare('SELECT COUNT(*) as count FROM message_likes').get();
console.log(`  留言总数: ${messageCount.count}`);
console.log(`  点赞总数: ${likeCount.count}`);

// 8. 订单统计
console.log('\n【8】订单统计');
console.log('─────────────────────────────────────');
const orderStats = db.prepare(`
  SELECT
    status,
    COUNT(*) as count,
    SUM(total_amount) as total
  FROM orders
  GROUP BY status
`).all();
if (orderStats.length > 0) {
  orderStats.forEach(s => {
    console.log(`  ${s.status.padEnd(15)}: ${s.count} 单，总额 ¥${s.total || 0}`);
  });
} else {
  console.log(`  暂无订单数据`);
}

// 9. 通知统计
console.log('\n【9】通知统计');
console.log('─────────────────────────────────────');
const notifStats = db.prepare(`
  SELECT
    type,
    COUNT(*) as count,
    SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
  FROM notifications
  GROUP BY type
`).all();
if (notifStats.length > 0) {
  notifStats.forEach(s => {
    console.log(`  ${s.type.padEnd(15)}: ${s.count} 条 (已读 ${s.read_count})`);
  });
} else {
  console.log(`  暂无通知数据`);
}

// 10. 收藏统计
console.log('\n【10】收藏统计');
console.log('─────────────────────────────────────');
const favCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get();
const topConcerts = db.prepare(`
  SELECT
    c.artist,
    c.city,
    c.concert_date,
    COUNT(f.id) as fav_count
  FROM concerts c
  LEFT JOIN favorites f ON c.id = f.concert_id
  GROUP BY c.id
  ORDER BY fav_count DESC
  LIMIT 5
`).all();
console.log(`  收藏总数: ${favCount.count}`);
if (topConcerts.length > 0 && topConcerts[0].fav_count > 0) {
  console.log(`  最受欢迎演唱会：`);
  topConcerts.forEach((c, i) => {
    if (c.fav_count > 0) {
      console.log(`    ${i + 1}. ${c.artist} ${c.city}站 (${c.fav_count} 人收藏)`);
    }
  });
}

console.log('\n========================================');
console.log('✅ 数据查看完成');
console.log('========================================\n');
