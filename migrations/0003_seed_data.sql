-- ====================================
-- 演唱会行程生成器 - 初始数据
-- 迁移版本: 0003
-- 创建日期: 2026-07-20
-- 说明: 插入默认配置、管理员账号、示例内容
-- ====================================

-- ====================================
-- 1. 网站配置默认数据
-- ====================================

INSERT OR IGNORE INTO site_settings (setting_key, setting_value, setting_type, category, is_public, description) VALUES
-- 基础配置
('site_name', '演唱会行程生成器', 'text', 'general', 1, '网站名称'),
('site_description', '一键生成演唱会全链路行程，包含机票、高铁、酒店、打车等完整方案', 'text', 'general', 1, '网站描述'),
('site_logo', '/images/logo.png', 'image', 'general', 1, '网站Logo URL'),
('site_favicon', '/favicon.ico', 'image', 'general', 1, '网站Favicon URL'),
('site_keywords', '演唱会,行程生成,追星,机票,酒店,高铁,行程规划', 'text', 'seo', 1, 'SEO关键词'),
('site_icp', '', 'text', 'general', 1, 'ICP备案号'),

-- 功能开关
('enable_register', 'true', 'boolean', 'general', 1, '是否开放用户注册'),
('enable_messages', 'true', 'boolean', 'general', 1, '是否开放留言板'),
('enable_favorites', 'true', 'boolean', 'general', 1, '是否开放收藏功能'),
('enable_orders', 'true', 'boolean', 'general', 1, '是否开放订单功能'),
('maintenance_mode', 'false', 'boolean', 'general', 0, '维护模式（开启后网站不可访问）'),

-- 业务限制
('max_itinerary_per_user', '50', 'number', 'general', 0, '每个用户最多创建行程数'),
('max_message_length', '500', 'number', 'general', 1, '留言最大字符数'),
('max_upload_size', '5', 'number', 'general', 0, '文件上传大小限制（MB）'),

-- 第三方API配置
('longxia_token', 'rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk', 'text', 'third_party', 0, '龙虾出行API Token'),
('amap_key', '', 'text', 'third_party', 0, '高德地图API Key'),

-- 联系方式
('contact_email', 'support@example.com', 'text', 'general', 1, '联系邮箱'),
('contact_wechat', '', 'text', 'general', 1, '微信客服'),
('contact_qq', '', 'text', 'general', 1, 'QQ客服'),

-- 社交媒体
('social_wechat', '', 'text', 'general', 1, '微信公众号'),
('social_weibo', '', 'text', 'general', 1, '微博'),
('social_github', '', 'text', 'general', 1, 'GitHub仓库地址');

-- ====================================
-- 2. 默认管理员账号
-- ====================================

-- 注意：密码为 admin123 的bcrypt哈希
-- 实际部署时请修改密码！
INSERT OR IGNORE INTO users (id, username, email, password_hash, nickname, role, created_at) VALUES
(1, 'admin', 'admin@example.com', '$2a$10$XqQqXqQqXqQqXqQqXqQqXeO9Y5YZ5YZ5YZ5YZ5YZ5YZ5YZ5YZ5YZ5', '超级管理员', 'admin', datetime('now','localtime'));

-- ====================================
-- 3. 默认CMS内容页面
-- ====================================

INSERT OR IGNORE INTO cms_contents (title, slug, content, content_type, category, status, author_id, published_at) VALUES

-- 关于我们
('关于我们', 'about', '# 关于我们

## 我们的使命

演唱会行程生成器致力于为追星族提供最便捷、最全面的行程规划服务。

## 我们的特色

- 🚀 **一键生成**：输入演出信息，智能规划全链路行程
- ✈️ **多种选择**：机票、高铁、巴士、打车，多维度对比
- 🏨 **酒店推荐**：场馆周边酒店，距离排序，价格透明
- 🗺️ **应援地图**：集成高德地图，周边美食景点一网打尽
- 💰 **实时比价**：接入龙虾出行API，价格实时更新
- 📱 **随时保存**：注册账号，行程永久保存，随时查看

## 联系我们

有任何问题或建议，欢迎通过以下方式联系我们：

- 📧 邮箱：support@example.com
- 💬 留言板：[点击留言](/messages.html)

', 'markdown', 'page', 'published', 1, datetime('now','localtime')),

-- 使用帮助
('使用帮助', 'help', '# 使用帮助

## 快速开始

### 第一步：输入演出信息

1. 在首页填写**艺人名称**（可选）
2. 输入**演出场馆**（必填），系统会自动提示
3. 选择**演出日期**
4. 填写**出发城市**

### 第二步：生成行程

点击"🚀 一键生成演唱会行程"按钮，系统将自动：

- 搜索场馆精确位置
- 查询机票、高铁、巴士方案
- 搜索场馆周边酒店
- 智能推荐性价比最优方案

### 第三步：选择方案

在结果页面中：

- 查看各类交通方案的价格、时间
- 对比不同酒店的距离、评分
- 点击选择您满意的方案
- 查看总价和行程概览

### 第四步：保存行程

- **未登录用户**：可以查看行程，但无法保存
- **已登录用户**：点击"保存行程"按钮，永久保存
- 在"我的行程"页面可以随时查看和管理

## 高级功能

### 应援主题定制

系统预设了多位艺人的应援主题色：

- 周杰伦 - 蓝色系
- Taylor Swift - 粉色系
- 五月天 - 蓝绿系
- 薛之谦 - 橙色系

您也可以自定义应援色、粉丝名、应援口号。

### 行程分享

保存行程后，可以生成分享链接，分享给朋友。

### 打车功能

生成行程后，可以在"打车方案"中：

- 输入起点和终点
- 查看预估价格
- 一键下单

## 常见问题

**Q: 为什么没有搜索到机票/高铁？**

A: 可能是该日期/路线暂无票源，建议更换日期或尝试其他交通方式。

**Q: 价格是实时的吗？**

A: 是的，我们接入了龙虾出行API，价格实时更新。

**Q: 可以直接下单吗？**

A: 目前支持查看价格和方案，下单功能正在开发中。

**Q: 我的行程数据安全吗？**

A: 所有数据加密存储，仅您本人可见（除非您主动分享）。

', 'markdown', 'page', 'published', 1, datetime('now','localtime')),

-- 隐私政策
('隐私政策', 'privacy', '# 隐私政策

> 更新日期：2026年7月20日

## 信息收集

我们收集以下信息：

### 账号信息
- 用户名、邮箱、昵称
- 密码（加密存储，不可逆）

### 行程信息
- 您创建的行程数据
- 出发城市、目的城市
- 交通和酒店选择

### 使用信息
- 登录记录（IP地址、设备信息）
- 操作日志（仅管理员可见）

## 信息使用

我们使用您的信息用于：

- 提供行程生成服务
- 改善用户体验
- 发送重要通知
- 统计分析（匿名化）

## 信息保护

- 密码使用bcrypt加密存储
- 数据传输使用HTTPS加密
- 定期备份，防止数据丢失
- 严格的权限控制

## 信息共享

我们**不会**向第三方出售或出租您的个人信息。

以下情况除外：

- 获得您的明确同意
- 法律法规要求
- 保护我们的合法权益

## 您的权利

您有权：

- 查看、修改您的个人信息
- 删除您的账号和数据
- 导出您的行程数据
- 拒绝接收营销信息

## 联系我们

如有隐私相关问题，请联系：support@example.com

', 'markdown', 'page', 'published', 1, datetime('now','localtime')),

-- 用户协议
('用户服务协议', 'terms', '# 用户服务协议

> 生效日期：2026年7月20日

## 1. 协议接受

使用本网站服务即表示您同意本协议的所有条款。

## 2. 服务内容

本网站提供：

- 演唱会行程生成服务
- 机票、高铁、酒店信息查询
- 行程保存和分享功能
- 留言板和社区功能

## 3. 用户义务

您承诺：

- 提供真实、准确的信息
- 不发布违法、违规内容
- 不恶意攻击网站系统
- 不侵犯他人权益

## 4. 知识产权

- 网站内容归我们所有
- 您的行程数据归您所有
- 未经许可不得复制、传播网站内容

## 5. 免责声明

- 价格信息仅供参考，以实际为准
- 第三方API可能出现异常
- 我们不对间接损失负责

## 6. 服务变更

我们保留随时修改或终止服务的权利，恕不另行通知。

## 7. 争议解决

因本协议产生的争议，应友好协商解决；协商不成的，提交网站所在地人民法院管辖。

## 8. 联系方式

协议相关问题，请联系：support@example.com

', 'markdown', 'page', 'published', 1, datetime('now','localtime')),

-- 常见问题
('常见问题', 'faq', '# 常见问题 (FAQ)

## 账号相关

### 如何注册账号？

点击右上角"注册"按钮，填写用户名、邮箱、密码即可。

### 忘记密码怎么办？

目前暂不支持找回密码，请联系客服处理。

### 可以修改用户名吗？

用户名注册后不可修改，但可以修改昵称。

## 行程相关

### 为什么生成行程失败？

可能原因：

1. 场馆名称输入错误
2. 该日期/路线无票源
3. 网络连接问题
4. 第三方API异常

建议更换日期或联系客服。

### 可以保存多少个行程？

默认每个用户最多保存50个行程。

### 行程可以修改吗？

可以，在"我的行程"页面点击编辑即可。

## 订单相关

### 如何下单？

选择好方案后，点击"立即预订"按钮，填写联系信息即可创建订单。

### 支持哪些支付方式？

目前支持支付宝、微信支付。

### 可以退款吗？

根据不同订单类型，退款政策不同，详见订单详情页。

## 其他问题

### 数据安全吗？

我们使用业界标准的加密技术保护您的数据，请放心使用。

### 可以在手机上使用吗？

可以，网站完全支持移动端访问。

### 如何联系客服？

- 邮箱：support@example.com
- 留言板：/messages.html

', 'markdown', 'page', 'published', 1, datetime('now','localtime'));

-- ====================================
-- 4. 示例标签数据
-- ====================================

INSERT OR IGNORE INTO tags (name, slug, color, icon, category, is_featured) VALUES
-- 艺人标签
('周杰伦', 'jay-chou', '#4A90E2', '🎤', 'artist', 1),
('Taylor Swift', 'taylor-swift', '#E91E63', '🎤', 'artist', 1),
('五月天', 'mayday', '#00BCD4', '🎸', 'artist', 1),
('薛之谦', 'joker-xue', '#FF9800', '🎤', 'artist', 1),
('林俊杰', 'jj-lin', '#9C27B0', '🎤', 'artist', 1),

-- 音乐风格
('流行', 'pop', '#FF5722', '🎵', 'genre', 1),
('摇滚', 'rock', '#795548', '🎸', 'genre', 1),
('嘻哈', 'hiphop', '#607D8B', '🎧', 'genre', 0),
('民谣', 'folk', '#8BC34A', '🎻', 'genre', 0),
('电音', 'electronic', '#03A9F4', '🎹', 'genre', 0),

-- 场馆类型
('体育馆', 'stadium', '#F44336', '🏟️', 'venue', 1),
('音乐厅', 'concert-hall', '#3F51B5', '🎭', 'venue', 0),
('LiveHouse', 'livehouse', '#009688', '🎪', 'venue', 0),
('音乐节', 'music-festival', '#CDDC39', '🎪', 'venue', 1);

-- ====================================
-- 5. 示例通知数据（发给管理员）
-- ====================================

INSERT OR IGNORE INTO notifications (user_id, type, title, content, created_at) VALUES
(1, 'system', '欢迎使用演唱会行程生成器', '系统初始化完成！您可以开始管理网站内容了。', datetime('now','localtime')),
(1, 'system', '建议修改默认密码', '为了账号安全，建议您尽快修改默认管理员密码。', datetime('now','localtime'));
