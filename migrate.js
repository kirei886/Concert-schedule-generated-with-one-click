/**
 * 数据库迁移脚本
 * 执行新增管理表的创建
 */
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

console.log('========================================');
console.log('开始执行数据库迁移...');
console.log('========================================');

try {
  // 读取迁移SQL文件
  const migration1 = fs.readFileSync(path.join(__dirname, 'migrations', '0002_management_tables.sql'), 'utf-8');
  const migration2 = fs.readFileSync(path.join(__dirname, 'migrations', '0003_seed_data.sql'), 'utf-8');

  console.log('\n[1/2] 执行 0002_management_tables.sql...');
  db.exec(migration1);
  console.log('✅ 管理表创建成功！');

  console.log('\n[2/2] 执行 0003_seed_data.sql...');
  db.exec(migration2);
  console.log('✅ 初始数据插入成功！');

  // 验证结果
  console.log('\n========================================');
  console.log('验证迁移结果...');
  console.log('========================================');

  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`\n📊 数据库共有 ${tables.length} 张表：`);
  tables.forEach(t => console.log(`  - ${t.name}`));

  // 检查配置数据
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get();
  console.log(`\n✅ 网站配置：${settingsCount.count} 条`);

  const cmsCount = db.prepare('SELECT COUNT(*) as count FROM cms_contents').get();
  console.log(`✅ CMS内容页：${cmsCount.count} 页`);

  const tagsCount = db.prepare('SELECT COUNT(*) as count FROM tags').get();
  console.log(`✅ 标签：${tagsCount.count} 个`);

  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
  console.log(`✅ 管理员账号：${adminCount.count} 个`);

  const notifCount = db.prepare('SELECT COUNT(*) as count FROM notifications').get();
  console.log(`✅ 通知：${notifCount.count} 条`);

  console.log('\n========================================');
  console.log('🎉 数据库迁移完成！');
  console.log('========================================');
  console.log('\n⚠️  重要提示：');
  console.log('  - 默认管理员账号：admin');
  console.log('  - 默认密码：admin123');
  console.log('  - 请尽快修改密码！\n');

  console.log('📋 新增的表：');
  console.log('  1. site_settings - 网站配置');
  console.log('  2. cms_contents - 内容管理');
  console.log('  3. banners - 轮播图');
  console.log('  4. admin_logs - 操作日志');
  console.log('  5. notifications - 通知');
  console.log('  6. tags / taggables - 标签系统');
  console.log('  7. login_records - 登录记录');
  console.log('  8. statistics - 统计数据');
  console.log('  9. feedbacks - 反馈建议');
  console.log('  10. coupons / user_coupons - 优惠券\n');

} catch (error) {
  console.error('\n❌ 迁移失败：', error.message);
  console.error(error.stack);
  process.exit(1);
}
