# 演唱会行程生成器 - 完整系统设计方案

## 一、技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML + CSS + 原生JS | 保持现有架构，无需构建工具，新增登录/注册/个人中心页面 |
| 后端 | Node.js + Express | 从原生 http 升级为 Express，支持路由分组、中间件 |
| 数据库 | SQLite (better-sqlite3) | 轻量级嵌入式数据库，零配置，数据文件为单个 .db 文件 |
| 认证 | JWT (jsonwebtoken) + bcrypt | 无状态认证，密码哈希存储 |
| 校验 | express-validator | 请求参数校验 |
| 第三方API | 龙虾出行 + 高德地图 | 机票/高铁/酒店/巴士/定位/路线规划 |

### 为什么选 SQLite？
- 零安装，数据就是一个 `data/app.db` 文件
- better-sqlite3 是同步 API，性能优于异步驱动
- 后续如需迁移 MySQL，SQL 语句几乎不用改

### 为什么不用前端框架（Vue/React）？
- 现有 index.html 已经是完整的单页应用，迁移成本高
- 用户量不大的工具型应用，原生 JS 完全够用
- 后续如需升级，可以渐进式引入 Alpine.js 或 Vue 3 CDN 版

---

## 二、数据库设计

### 2.1 users（用户表）

```sql
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,              -- 用户名（登录用）
    email         TEXT NOT NULL UNIQUE,              -- 邮箱
    password_hash TEXT NOT NULL,                     -- bcrypt哈希密码
    nickname      TEXT,                              -- 昵称（展示用）
    avatar_url    TEXT DEFAULT '',                   -- 头像URL
    phone         TEXT DEFAULT '',                   -- 手机号
    fan_color     TEXT DEFAULT '',                   -- 偏好应援色（hex）
    fan_name      TEXT DEFAULT '',                   -- 粉丝名
    fan_slogan    TEXT DEFAULT '',                   -- 应援口号
    role          TEXT DEFAULT 'user',               -- 角色: user / admin
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    updated_at    TEXT DEFAULT (datetime('now','localtime'))
);
```

### 2.2 concerts（演唱会表）

```sql
CREATE TABLE IF NOT EXISTS concerts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    artist        TEXT NOT NULL,                     -- 艺人名
    tour_name     TEXT,                              -- 巡演名称
    city          TEXT NOT NULL,                     -- 城市
    venue         TEXT,                              -- 场馆
    concert_date  TEXT NOT NULL,                     -- 演唱会日期 YYYY-MM-DD
    start_time    TEXT DEFAULT '19:00',              -- 开演时间
    status        TEXT DEFAULT 'upcoming',           -- upcoming/selling/sold_out/finished
    tag           TEXT DEFAULT '',                   -- 标签：热卖中/预售中/即将开唱等
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);
```

### 2.3 itineraries（行程表）

```sql
CREATE TABLE IF NOT EXISTS itineraries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    concert_id    INTEGER,                           -- 可为空（用户自定义行程）
    title         TEXT,                              -- 行程标题
    depart_city   TEXT,                              -- 出发城市
    dest_city     TEXT,                              -- 目的城市
    travel_date   TEXT,                              -- 出行日期
    flight_info   TEXT DEFAULT '',                   -- 选中航班信息（JSON）
    train_info    TEXT DEFAULT '',                   -- 选中高铁信息（JSON）
    bus_info      TEXT DEFAULT '',                   -- 选中巴士信息（JSON）
    hotel_info    TEXT DEFAULT '',                   -- 选中酒店信息（JSON）
    check_in      TEXT,                              -- 入住日期
    check_out     TEXT,                              -- 退房日期
    total_budget  REAL DEFAULT 0,                    -- 预算总额
    notes         TEXT DEFAULT '',                   -- 备注
    is_public     INTEGER DEFAULT 0,                 -- 是否公开 0/1
    share_code    TEXT DEFAULT '',                   -- 分享码（6位随机字符）
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    updated_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE SET NULL
);
```

### 2.4 messages（留言表）

```sql
CREATE TABLE IF NOT EXISTS messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    parent_id     INTEGER DEFAULT NULL,              -- 父留言ID（回复）
    content       TEXT NOT NULL,                     -- 留言内容
    sticker       TEXT DEFAULT '',                   -- 贴图标识
    likes_count   INTEGER DEFAULT 0,                 -- 点赞数（冗余字段，加速查询）
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

### 2.5 message_likes（点赞记录表）

```sql
CREATE TABLE IF NOT EXISTS message_likes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id    INTEGER NOT NULL,
    user_id       INTEGER NOT NULL,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(message_id, user_id),                     -- 防重复点赞
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2.6 favorites（收藏表）

```sql
CREATE TABLE IF NOT EXISTS favorites (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    concert_id    INTEGER NOT NULL,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(user_id, concert_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);
```

---

## 三、API 接口设计

### 3.1 认证模块 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 用户注册 | 否 |
| POST | /api/auth/login | 用户登录 | 否 |
| POST | /api/auth/logout | 退出登录 | 是 |
| GET  | /api/auth/me | 获取当前用户信息 | 是 |
| PUT  | /api/auth/profile | 更新个人信息 | 是 |
| PUT  | /api/auth/password | 修改密码 | 是 |

**注册请求示例：**
```json
POST /api/auth/register
{
  "username": "concertlover",
  "email": "user@example.com",
  "password": "MyPassword123",
  "nickname": "追光少女"
}
```

**登录响应示例：**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "concertlover",
      "nickname": "追光少女",
      "avatar_url": "",
      "role": "user"
    }
  }
}
```

### 3.2 演唱会模块 `/api/concerts`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET  | /api/concerts | 获取演唱会列表（支持筛选/分页） | 否 |
| GET  | /api/concerts/:id | 获取演唱会详情 | 否 |
| GET  | /api/concerts/hot | 获取热门演唱会（随机排序） | 否 |
| POST | /api/concerts | 添加演唱会 | admin |
| PUT  | /api/concerts/:id | 修改演唱会 | admin |
| DELETE | /api/concerts/:id | 删除演唱会 | admin |

**列表查询参数：**
```
GET /api/concerts?city=上海&artist=周杰伦&page=1&limit=20&status=selling
```

### 3.3 行程模块 `/api/itineraries`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET  | /api/itineraries | 获取我的行程列表 | 是 |
| GET  | /api/itineraries/:id | 获取行程详情 | 是 |
| POST | /api/itineraries | 创建行程 | 是 |
| PUT  | /api/itineraries/:id | 更新行程 | 是 |
| DELETE | /api/itineraries/:id | 删除行程 | 是 |
| GET  | /api/itineraries/share/:code | 获取分享的行程 | 否 |
| POST | /api/itineraries/:id/share | 生成分享链接 | 是 |

**创建行程请求示例：**
```json
POST /api/itineraries
{
  "concert_id": 1,
  "title": "周杰伦上海演唱会行程",
  "depart_city": "北京",
  "dest_city": "上海",
  "travel_date": "2026-08-08",
  "flight_info": "{\"flight_no\":\"CA1234\",\"price\":890,...}",
  "hotel_info": "{\"name\":\"如家酒店\",\"price\":299,...}",
  "check_in": "2026-08-08",
  "check_out": "2026-08-09",
  "total_budget": 1500,
  "notes": "记得带荧光棒",
  "is_public": true
}
```

### 3.4 留言模块 `/api/messages`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET  | /api/messages | 获取留言列表（支持分页） | 否 |
| POST | /api/messages | 发表留言 | 是 |
| DELETE | /api/messages/:id | 删除留言（仅作者或管理员） | 是 |
| POST | /api/messages/:id/like | 点赞 | 是 |
| DELETE | /api/messages/:id/like | 取消点赞 | 是 |
| GET  | /api/messages/:id/replies | 获取回复列表 | 否 |

### 3.5 收藏模块 `/api/favorites`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET  | /api/favorites | 获取我的收藏列表 | 是 |
| POST | /api/favorites | 添加收藏 | 是 |
| DELETE | /api/favorites/:concertId | 取消收藏 | 是 |

### 3.6 出行代理模块（保持现有）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/flight-search | 机票搜索 |
| POST | /api/train-search | 高铁搜索 |
| POST | /api/hotel-search | 酒店搜索 |
| GET  | /api/reverse-geocode | 逆地理编码 |
| GET  | /api/poi-search | POI搜索 |
| GET  | /api/nearby-search | 附近搜索 |
| GET  | /api/route-plan | 路线规划 |
| GET  | /api/city-airport | 城市机场查询 |

---

## 四、前端页面规划

### 4.1 页面清单

| 页面 | 文件 | 说明 | 认证 |
|------|------|------|------|
| 行程生成器 | index.html | 现有主页，新增登录状态展示 | 否 |
| 登录 | login.html | 用户名/邮箱 + 密码登录 | 否 |
| 注册 | register.html | 用户注册 | 否 |
| 我的行程 | my-trips.html | 查看已保存的行程列表 | 是 |
| 行程详情 | trip-detail.html | 查看单个行程详情/分享页 | 否 |
| 个人中心 | profile.html | 修改个人信息/应援色/密码 | 是 |
| 留言板 | messages.html | 独立留言板页面 | 否（发帖需登录） |

### 4.2 前端认证流程

```
用户打开页面
  ├─ 检查 localStorage 中是否有 token
  │   ├─ 有 → 调用 /api/auth/me 验证
  │   │   ├─ 有效 → 显示用户信息 + 登出按钮
  │   │   └─ 无效 → 清除 token，显示登录按钮
  │   └─ 无 → 显示登录/注册按钮
  │
  ├─ 未登录用户：可使用行程生成器，但无法保存行程
  └─ 已登录用户：生成行程后可点击"保存行程"按钮
```

### 4.3 前端公共模块 `js/common.js`

```javascript
// 全局认证工具
const Auth = {
  getToken: () => localStorage.getItem('concert_token'),
  setToken: (token) => localStorage.setItem('concert_token', token),
  clearToken: () => localStorage.removeItem('concert_token'),

  async getUser() {
    const token = this.getToken();
    if (!token) return null;
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
    this.clearToken();
    return null;
  },

  // 带 token 的 fetch 封装
  async apiFetch(url, options = {}) {
    const token = this.getToken();
    if (token) {
      options.headers = options.headers || {};
      options.headers['Authorization'] = 'Bearer ' + token;
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      this.clearToken();
      window.location.href = '/login.html';
      return;
    }
    return res;
  }
};
```

---

## 五、目录结构

```
演唱会行程生成器/
├── package.json
├── server.js                    # 入口：启动 Express
├── src/
│   ├── db.js                    # 数据库初始化 + 连接池
│   ├── init-db.js               # 建表脚本（首次运行自动执行）
│   ├── middleware/
│   │   ├── auth.js              # JWT 认证中间件
│   │   └── error.js             # 统一错误处理
│   └── routes/
│       ├── auth.js              # 认证路由
│       ├── concerts.js          # 演唱会路由
│       ├── itineraries.js       # 行程路由
│       ├── messages.js          # 留言路由
│       ├── favorites.js         # 收藏路由
│       └── proxy.js             # 第三方API代理路由
├── data/
│   └── app.db                   # SQLite 数据库文件（自动创建）
├── public/
│   ├── index.html               # 行程生成器主页（现有）
│   ├── login.html               # 登录页
│   ├── register.html            # 注册页
│   ├── my-trips.html            # 我的行程
│   ├── trip-detail.html         # 行程详情/分享页
│   ├── profile.html             # 个人中心
│   ├── messages.html            # 留言板
│   ├── hot-concerts.json        # 演唱会初始数据
│   ├── js/
│   │   ├── common.js            # 公共工具（Auth、API封装）
│   │   └── components.js        # 公共组件（导航栏、页脚）
│   └── css/
│       └── common.css           # 公共样式
└── start.bat
```

---

## 六、实施计划

### 阶段一：后端基础搭建
1. 安装依赖：express, better-sqlite3, jsonwebtoken, bcryptjs, express-validator
2. 创建 `src/db.js` 和 `src/init-db.js`，实现数据库初始化
3. 创建认证中间件 `src/middleware/auth.js`
4. 将现有 server.js 重构为 Express 架构

### 阶段二：认证系统
5. 实现注册/登录/登出 API
6. 实现 JWT 签发与验证
7. 创建 `login.html` 和 `register.html` 页面
8. 创建 `js/common.js` 公共认证工具

### 阶段三：核心业务
9. 实现演唱会 CRUD API + 数据迁移（hot-concerts.json → 数据库）
10. 实现行|程 CRUD API + 分享功能
11. 创建 `my-trips.html` 和 `trip-detail.html`
12. 在 index.html 中集成"保存行程"功能

### 阶段四：互动功能
13. 实现留言 API（发帖/回复/点赞）
14. 实现收藏 API
15. 创建 `profile.html` 个人中心
16. 将现有 localStorage 留言板迁移到后端

### 阶段五：优化上线
17. 添加管理员后台（演唱会数据管理）
18. 性能优化（数据库索引、API缓存）
19. 安全加固（限流、CSRF防护、输入校验）
20. 部署文档

---

## 七、安全设计

| 安全措施 | 实现方式 |
|----------|----------|
| 密码存储 | bcryptjs 哈希，salt rounds = 10 |
| 身份认证 | JWT token，有效期 7 天，HttpOnly Cookie 或 localStorage |
| SQL注入防护 | better-sqlite3 参数化查询（prepare + bind） |
| XSS防护 | 前端输入转义，CSP 头部设置 |
| 限流防护 | express-rate-limit，每 IP 每 15 分钟 100 次请求 |
| CORS | 仅允许同源访问，API 代理层不需要 CORS |
| 敏感信息 | API Token 通过环境变量注入，不硬编码 |
