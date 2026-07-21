-- Cloudflare D1 初始数据
-- 插入默认配置和管理员账号

-- ====================================
-- 1. 管理员账号
-- ====================================
-- 密码：admin123 的 bcrypt hash
INSERT OR IGNORE INTO users (id, username, email, password_hash, nickname, role, created_at) VALUES
(1, 'admin', 'admin@music.tripay.cn', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '超级管理员', 'admin', datetime('now'));

-- ====================================
-- 2. 网站配置
-- ====================================
INSERT OR IGNORE INTO site_settings (setting_key, setting_value, setting_type, category, is_public, description) VALUES
-- 基础配置
('site_name', '音乐行程助手', 'text', 'general', 1, '网站名称'),
('site_description', '演唱会行程一键生成，包含机票、高铁、酒店等完整方案', 'text', 'general', 1, '网站描述'),
('site_logo', '/images/logo.png', 'image', 'general', 1, '网站Logo'),
('site_keywords', '演唱会,音乐,行程生成,追星,机票,酒店', 'text', 'seo', 1, 'SEO关键词'),
('contact_email', 'support@tripay.cn', 'text', 'general', 1, '联系邮箱'),

-- 功能开关
('enable_register', 'true', 'boolean', 'general', 1, '是否开放注册'),
('enable_messages', 'true', 'boolean', 'general', 1, '是否开放留言板'),
('enable_favorites', 'true', 'boolean', 'general', 1, '是否开放收藏'),
('maintenance_mode', 'false', 'boolean', 'general', 0, '维护模式'),

-- 业务限制
('max_itinerary_per_user', '50', 'number', 'general', 0, '每用户最大行程数'),
('max_message_length', '500', 'number', 'general', 1, '留言最大字符数'),

-- 第三方API
('longxia_token', 'rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk', 'text', 'third_party', 0, '龙虾出行Token'),
('amap_key', '', 'text', 'third_party', 0, '高德地图Key');

-- ====================================
-- 3. CMS 内容页面
-- ====================================
INSERT OR IGNORE INTO cms_contents (title, slug, content, content_type, category, status, author_id, published_at) VALUES
('关于我们', 'about', '# 关于我们

音乐行程助手 (music.tripay.cn) 致力于为音乐爱好者提供便捷的演唱会行程规划服务。

## 我们的特色

- 🎵 **一键生成** - 输入演出信息，智能规划全链路行程
- ✈️ **多种选择** - 机票、高铁、巴士，多维度对比
- 🏨 **酒店推荐** - 场馆周边酒店，距离排序
- 🗺️ **应援地图** - 周边美食景点一网打尽

## 联系我们

📧 邮箱：support@tripay.cn
', 'markdown', 'page', 'published', 1, datetime('now')),

('使用帮助', 'help', '# 使用帮助

## 快速开始

### 1. 生成行程
1. 输入演出信息（场馆、日期、出发城市）
2. 点击"一键生成行程"
3. 查看并选择方案

### 2. 保存行程
- 注册账号后可永久保存行程
- 随时查看和编辑

### 3. 社区互动
- 留言板交流
- 收藏演唱会
- 分享行程

## 常见问题

**Q: 价格是实时的吗？**
A: 是的，我们接入实时API，价格即时更新。

**Q: 可以直接订票吗？**
A: 目前提供方案对比，订票功能开发中。
', 'markdown', 'page', 'published', 1, datetime('now')),

('隐私政策', 'privacy', '# 隐私政策

> 更新时间：2026-07-20

## 信息收集

我们收集以下信息：
- 账号信息（用户名、邮箱）
- 行程信息
- 使用记录

## 信息使用

- 提供服务
- 改善体验
- 数据统计

## 信息保护

- 密码加密存储
- HTTPS 传输
- 严格权限控制

我们不会向第三方出售您的信息。
', 'markdown', 'page', 'published', 1, datetime('now')),

('用户协议', 'terms', '# 用户服务协议

> 生效日期：2026-07-20

## 服务内容

本网站提供演唱会行程规划服务。

## 用户义务

- 提供真实信息
- 不发布违规内容
- 遵守法律法规

## 免责声明

- 价格仅供参考
- 第三方API可能异常
- 不对间接损失负责

## 联系方式

support@tripay.cn
', 'markdown', 'page', 'published', 1, datetime('now'));

-- ====================================
-- 4. 标签
-- ====================================
INSERT OR IGNORE INTO tags (name, slug, color, icon, category, is_featured) VALUES
-- 艺人标签
('周杰伦', 'jay-chou', '#4A90E2', '🎤', 'artist', 1),
('Taylor Swift', 'taylor-swift', '#E91E63', '🎤', 'artist', 1),
('五月天', 'mayday', '#00BCD4', '🎸', 'artist', 1),
('薛之谦', 'joker-xue', '#FF9800', '🎤', 'artist', 1),

-- 风格标签
('流行', 'pop', '#FF5722', '🎵', 'genre', 1),
('摇滚', 'rock', '#795548', '🎸', 'genre', 1),
('民谣', 'folk', '#8BC34A', '🎻', 'genre', 0),

-- 场馆标签
('体育馆', 'stadium', '#F44336', '🏟️', 'venue', 1),
('音乐厅', 'concert-hall', '#3F51B5', '🎭', 'venue', 0),
('音乐节', 'music-festival', '#CDDC39', '🎪', 'venue', 1);

-- ====================================
-- 5. 演唱会数据（示例）
-- ====================================
INSERT OR IGNORE INTO concerts (artist, tour_name, city, venue, concert_date, start_time, status, tag) VALUES
('周杰伦', '嘉年华世界巡回演唱会', '上海', '梅赛德斯奔驰文化中心', '2026-08-15', '19:30', 'selling', '热门'),
('Taylor Swift', 'The Eras Tour', '北京', '国家体育场鸟巢', '2026-09-20', '19:00', 'selling', '热门'),
('五月天', '人生无限公司巡回演唱会', '深圳', '深圳湾体育中心', '2026-10-10', '19:30', 'upcoming', '即将开售'),
('薛之谦', '天外来物巡回演唱会', '成都', '成都露天音乐公园', '2026-11-05', '19:00', 'upcoming', '即将开售');

-- ====================================
-- 6. 欢迎通知
-- ====================================
INSERT OR IGNORE INTO notifications (user_id, type, title, content, sender_id, created_at) VALUES
(1, 'system', '欢迎使用音乐行程助手', '感谢您使用 music.tripay.cn，祝您追星愉快！', NULL, datetime('now')),
(1, 'system', '请修改默认密码', '为了账号安全，建议您尽快修改默认管理员密码。', NULL, datetime('now'));
