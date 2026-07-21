# 🎵 演唱会行程生成器

> 一键生成演唱会全链路行程，包含机票、高铁、酒店等完整方案

[![Version](https://img.shields.io/badge/version-2.1-blue.svg)](https://github.com)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## ✨ 功能特性

### 🎯 核心功能
- ✅ **一键生成行程** - 输入演出信息，智能规划全链路行程
- ✅ **多种交通方式** - 机票、高铁、城际巴士、打车，多维度对比
- ✅ **酒店推荐** - 场馆周边酒店，距离排序，价格透明
- ✅ **应援地图** - 集成高德地图，周边美食景点一网打尽
- ✅ **实时比价** - 接入龙虾出行API，价格实时更新
- ✅ **行程保存** - 注册账号，行程永久保存，随时查看

### 🎨 应援功能
- ✅ **应援主题** - 预设多位艺人专属主题色
- ✅ **自定义应援** - 设置粉丝名、应援色、应援口号
- ✅ **留言板** - 粉丝交流、发帖、点赞、回复
- ✅ **演唱会收藏** - 关注喜欢的演唱会

### 🛠️ 管理功能
- ✅ **网站配置管理** - 灵活配置网站信息、功能开关
- ✅ **内容管理系统** - Markdown支持，轻松发布内容页面
- ✅ **通知系统** - 站内消息、全站广播
- ✅ **用户管理** - 用户信息、权限管理
- ✅ **订单管理** - 订单查询、状态管理
- ✅ **数据统计** - 多维度数据分析

---

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/Huiling-123/111.git
cd 111

# 2. 安装依赖
npm install

# 3. 初始化数据库（首次运行会自动执行）
npm start

# 4. 访问应用
# 前台：http://localhost:3000
# 管理后台：http://localhost:3000/admin-dashboard.html
```

### 默认账号
```
管理员账号：admin
密码：admin123
⚠️ 首次登录后请立即修改密码！
```

---

## 📸 功能截图

### 前台页面
- 行程生成器 - 智能规划演唱会行程
- 我的行程 - 查看保存的行程
- 留言板 - 粉丝交流互动

### 管理后台
- 仪表盘 - 数据统计一览
- 网站配置 - 灵活配置管理
- 内容管理 - CMS内容发布
- 通知管理 - 消息推送

---

## 🛠️ 技术栈

### 后端
- **运行环境**：Node.js
- **Web框架**：Express 5.2.1
- **数据库**：SQLite (better-sqlite3)
- **认证**：JWT + bcrypt
- **校验**：express-validator
- **限流**：express-rate-limit

### 前端
- **HTML5** + **CSS3**
- **原生 JavaScript** (ES6+)
- **Fetch API**
- **响应式设计**

### 第三方服务
- **龙虾出行API** - 机票、高铁、酒店、巴士查询
- **高德地图API** - POI搜索、路线规划

---

## 📁 项目结构

```
111/
├── data/                    # 数据库文件
├── docs/                    # 📚 技术文档
├── migrations/              # SQL迁移文件
├── src/
│   ├── middleware/          # 中间件（认证、错误处理）
│   └── routes/              # API路由
├── public/
│   ├── css/                 # 样式文件
│   ├── js/                  # JavaScript文件
│   ├── images/              # 图片资源
│   ├── index.html           # 行程生成器
│   ├── admin-*.html         # 管理后台页面
│   └── ...                  # 其他页面
├── migrate.js               # 数据库迁移脚本
├── view-data.js             # 数据查看工具
├── test-api.js              # API测试脚本
├── package.json
├── server.js                # 服务器入口
└── README.md
```

---

## 📖 文档

- [数据库设计文档](docs/database-design.md) - 完整的数据库设计方案
- [迁移指南](docs/migration-guide.md) - 数据库迁移步骤
- [API开发报告](docs/API-FRONTEND-REPORT.md) - API接口文档
- [快速参考](QUICK-REFERENCE.md) - 常用命令和API速查
- [项目总结](docs/FINAL-SUMMARY.md) - 完整开发总结

---

## 🔧 配置说明

### 环境变量
```bash
# .env 文件（可选）
PORT=3000                           # 服务器端口
JWT_SECRET=your_secret_key          # JWT密钥
LONGXIA_TOKEN=your_longxia_token    # 龙虾出行API Token
AMAP_KEY=your_amap_key              # 高德地图API Key
```

### 网站配置
访问管理后台 → 网站配置，可修改：
- 网站名称、Logo、描述
- SEO配置
- 功能开关（注册、留言板等）
- 第三方API配置

---

## 🎯 使用指南

### 1. 生成行程
1. 打开首页 http://localhost:3000
2. 输入演出信息（场馆、日期、出发城市）
3. 点击"一键生成行程"
4. 查看并选择合适的交通和酒店方案
5. （可选）保存行程到账号

### 2. 管理后台
1. 访问 http://localhost:3000/admin-dashboard.html
2. 使用管理员账号登录
3. 配置网站信息
4. 发布内容页面
5. 发送通知给用户

### 3. 常用命令
```bash
npm start              # 启动服务器
node view-data.js      # 查看数据库数据
node test-api.js       # 测试API接口
node migrate.js        # 重新迁移数据库
```

---

## 🔒 安全建议

1. ✅ 修改默认管理员密码
2. ✅ 配置环境变量（JWT_SECRET）
3. ✅ 启用HTTPS（生产环境）
4. ✅ 定期备份数据库
5. ✅ 配置防火墙规则
6. ✅ 限制管理后台访问IP

---

## 🐛 故障排查

### 端口被占用
```bash
# 修改端口
export PORT=3001
npm start
```

### 数据库错误
```bash
# 重新初始化数据库
rm data/app.db
npm start
```

### API接口404
```bash
# 确认路由是否正确注册
# 检查 server.js 文件
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📊 数据统计

- **数据库表**：19 张
- **API接口**：50+ 个
- **管理页面**：10+ 个
- **预置演唱会**：25 场
- **代码行数**：3500+ 行

---

## 🗺️ 路线图

### v2.2 (计划中)
- [ ] 用户管理页面
- [ ] 订单管理页面
- [ ] 操作日志页面
- [ ] 数据统计图表

### v2.3 (计划中)
- [ ] 文件上传功能
- [ ] 富文本编辑器
- [ ] 批量操作
- [ ] 数据导出

### v3.0 (未来)
- [ ] 迁移到 Cloudflare D1
- [ ] 实时通知（WebSocket）
- [ ] 移动端App
- [ ] 多语言支持

---

## 📄 许可证

[MIT License](LICENSE)

---

## 👥 团队

- **开发者**：Claude + Huiling
- **技术支持**：Claude Code

---

## 🙏 致谢

- [龙虾出行](https://longxiachuxing.com) - 提供出行API
- [高德地图](https://lbs.amap.com) - 提供地图服务
- [Express](https://expressjs.com) - Web框架
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite驱动

---

## 📞 联系我们

- **Issues**：[GitHub Issues](https://github.com/Huiling-123/111/issues)
- **邮箱**：support@example.com

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个星标！**

Made with ❤️ by Claude Code

</div>
