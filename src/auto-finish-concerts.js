/**
 * 自动同步脚本：定期将已过演出时间的演唱会状态自动改为"已结束"
 * 触发条件：当前日期 > 演出日期
 * 执行频率：每小时一次（可调整）
 */
const db = require('./db');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1小时执行一次

function autoFinishExpiredConcerts() {
  try {
    const today = new Date().toISOString().split('T')[0];
    // 找出所有非 finished 状态但演出日期已过期的演唱会
    const expiredConcerts = db.prepare(`
      SELECT id, artist, city, concert_date, status, tag
      FROM concerts
      WHERE concert_date < ? AND status != 'finished'
    `).all(today);

    if (expiredConcerts.length === 0) {
      return { updated: 0, message: '没有需要更新的过期演唱会' };
    }

    // 批量更新：状态改为 finished，标签改为"已结束"
    const updateStmt = db.prepare(`
      UPDATE concerts
      SET status = 'finished', tag = '已结束'
      WHERE id = ?
    `);

    const updateMany = db.transaction((items) => {
      for (const c of items) {
        updateStmt.run(c.id);
      }
    });
    updateMany(expiredConcerts);

    const details = expiredConcerts.map(c =>
      `${c.artist} ${c.city} ${c.concert_date}`
    ).join('、');

    console.log(`[AutoFinish] 自动更新 ${expiredConcerts.length} 场已过期演唱会为"已结束": ${details}`);
    return { updated: expiredConcerts.length, details };
  } catch (err) {
    console.error('[AutoFinish] 自动更新失败:', err.message);
    return { updated: 0, error: err.message };
  }
}

// 启动定时任务
let autoFinishTimer = null;

function startAutoFinishSchedule() {
  // 立即执行一次（服务器启动时）
  autoFinishExpiredConcerts();

  // 设置定时任务
  if (autoFinishTimer) clearInterval(autoFinishTimer);
  autoFinishTimer = setInterval(() => {
    autoFinishExpiredConcerts();
  }, CHECK_INTERVAL_MS);

  console.log(`[AutoFinish] 定时任务已启动，每 ${CHECK_INTERVAL_MS / 1000 / 60} 分钟检查一次过期演唱会`);
}

function stopAutoFinishSchedule() {
  if (autoFinishTimer) {
    clearInterval(autoFinishTimer);
    autoFinishTimer = null;
    console.log('[AutoFinish] 定时任务已停止');
  }
}

module.exports = {
  autoFinishExpiredConcerts,
  startAutoFinishSchedule,
  stopAutoFinishSchedule
};
