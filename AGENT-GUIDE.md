# AI Agent 项目指南 / Project Guide for AI Agents

> **用途 / Purpose**: 本文档供 AI 编程助手（Claude Code / Cursor / Copilot 等）快速理解本项目的架构、约定与踩坑点，从而安全地继续开发与修复问题。
> **Audience**: AI coding assistants. Read this fully before making changes.

---

## 1. 项目概述 / Overview

**项目名**: 演唱会专属全链路行程一键生成器 (Star-Chase Itinerary)

**一句话描述**: 用户输入演唱会信息，系统一键生成"机票 + 火车 + 酒店 + 打车"全链路出行方案，并支持在线下单支付。第三方出行资源通过「龙虾出行 (longxiachuxing)」开放平台 API 提供。

**技术栈**:
- **后端**: Cloudflare Workers（生产）+ Express/Node（本地开发遗留），路由库 `itty-router`
- **数据库**: Cloudflare D1（生产，SQLite 兼容）+ better-sqlite3（本地遗留）
- **前端**: 纯静态 HTML/CSS/JS（无框架），部署于 Cloudflare Pages
- **第三方**: 龙虾出行 API（机票/火车/酒店/打车/地理编码）

---

## 2. ⚠️ 关键架构事实（必读，避免踩坑）

1. **生产环境入口只有一个文件**: `src/worker-with-proxy.js`。
   - 由 `wrangler.toml` 的 `main` 字段指定。
   - `src/` 下还有 `worker.js`、`worker-full.js`、`worker-simple.js`、`worker-v5.js` 等**历史遗留文件，均未启用**。不要修改它们，也不要被它们误导。
   - `src/routes/*.js` 是**早期模块化路由的遗留代码，生产环境未使用**。真正生效的所有路由都内联在 `worker-with-proxy.js` 里。

2. **本地 Node 服务 (`server.js` + better-sqlite3) 与生产 Workers 是两套独立实现**。
   - 修改本地 SQLite（如 `src/init-db.js`）**不会**影响生产。
   - 生产用的是 Cloudflare D1，数据库结构变更必须用 `wrangler d1 execute --remote` 单独执行（见 §7）。

3. **前端有两条下单路径，都要保持同步**：
   - 路径 A（主要）: `cloudflare-pages/index.html` 主页"一键生成行程"下方的购买按钮 → `showOrderFormModal()` → `POST /api/orders`。**用户实际使用的是这条**。
   - 路径 B（备用）: 独立页面 `flights.html → flight-list.html → flight-booking.html`。功能完整但用户当前不用。
   - **修改下单逻辑时两条路径都要检查**，否则会出现"改了 A 没改 B"的问题。

4. **前端所有 API 调用硬编码指向**: `https://concert-itinerary-api.music-tripay.workers.dev`。

---

## 3. 目录结构 / Directory Layout

```
111/
├── wrangler.toml                 # Workers 配置（入口、D1 绑定、环境变量）
├── package.json                  # 依赖（本地 Node 用）
├── server.js                     # 本地 Express 服务（遗留，生产不用）
├── src/
│   ├── worker-with-proxy.js      # ★生产入口，所有 API 都在这里
│   ├── init-db.js                # 本地 SQLite 建表（遗留）
│   ├── worker*.js                # 其余均为遗留，未启用
│   ├── routes/                   # 遗留模块化路由，未启用
│   ├── middleware/               # 遗留
│   └── utils/                    # 遗留
└── cloudflare-pages/             # ★前端静态站点（部署到 Pages）
    ├── index.html                # 主页（含一键生成 + 主要下单路径）
    ├── payment.html              # 支付页
    ├── orders.html               # 订单列表
    ├── flights.html              # 备用机票搜索页
    ├── flight-list.html          # 备用航班列表页
    ├── flight-booking.html       # 备用机票预订页
    └── ...                       # 登录/注册/留言/行程等
```

---

## 4. 部署 / Deployment

**前置**: 需已安装 `wrangler` CLI 并登录 Cloudflare 账号。首次拉取仓库后，复制配置模板并填入自己的值：
```bash
cp wrangler.toml.example wrangler.toml   # 然后填入 D1 database_id、JWT_SECRET、LONGXIA_TOKEN
```
（`wrangler.toml` 含密钥，已在 `.gitignore` 中忽略，不会进仓库。）


```bash
# 部署后端 Workers（改了 src/worker-with-proxy.js 后执行）
wrangler deploy

# 部署前端 Pages（改了 cloudflare-pages/ 下文件后执行）
wrangler pages deploy cloudflare-pages --commit-dirty=true

# 实时查看后端日志（调试必备，能看到 console.log 输出）
wrangler tail
```

- 后端生产域名: `https://concert-itinerary-api.music-tripay.workers.dev`
- 前端生产域名: `https://tripay-music-app.pages.dev`

---

## 5. 环境变量 / Env Vars（在 wrangler.toml 的 `[vars]`）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（注意：当前登录 token 实为 base64，非标准 JWT，见 §9） |
| `LONGXIA_TOKEN` | 龙虾开放平台 Bearer Token，格式 `rdak_live_xxx` |

> ⚠️ 这些密钥目前明文写在 `wrangler.toml` 里并可能已提交到 Git。上传 GitHub 前应改用 `wrangler secret put` 管理，并从仓库历史中清除真实密钥。

---

## 6. API 端点清单 / API Endpoints

全部定义在 `src/worker-with-proxy.js`。统一返回格式：`{ code, message, data }`，`code === 0` 表示成功。

### 认证 Auth
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录，返回 token |
| GET | `/api/auth/me` | 当前用户信息（需 Bearer token）|

### 龙虾资源代理 (Proxy)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/flight-search` | 机票搜索 |
| POST | `/api/flight-pricing` | 机票验价（下单前必须）|
| POST | `/api/train-search` | 火车搜索 |
| POST | `/api/hotel-search` | 酒店搜索 |
| POST | `/api/taxi-estimate` | 打车预估 |
| GET | `/api/city-airport` | 城市机场三字码 |
| GET | `/api/reverse-geocode` | 逆地理编码 |
| GET | `/api/poi-search` | POI 搜索 |
| GET | `/api/nearby-search` | 附近搜索 |

### 演唱会 Concerts
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/concerts` / `/api/hot-concerts` / `/api/concerts/:id` | 列表/热门/详情 |
| POST/PUT/DELETE | `/api/concerts[/:id]` | 增改删（需 admin）|

### 订单与支付 Orders & Payment（核心，机票逻辑集中于此）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/orders` | 创建订单。`item_type==='flight'` 时触发龙虾"验价→下单"流程 |
| GET | `/api/orders` | 我的订单列表 |
| GET | `/api/orders/:id` | 订单详情；机票订单会实时查询龙虾状态并同步 |
| POST | `/api/orders/:id/pay` | 发起支付；机票订单返回龙虾收银台链接 |
| POST | `/api/orders/:id/sync-status` | 轮询同步支付状态 |
| POST | `/api/payment/notify` | 支付回调（供龙虾/支付平台调用）|

### 行程与留言 Itineraries & Messages
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/PUT/DELETE | `/api/itineraries[/:id]` | 行程 CRUD |
| GET/POST/DELETE | `/api/messages[...]` | 留言板 + 点赞 |

其他: `GET /api/health`（健康检查）、`GET /api/settings/public`（公开配置）。

---

## 7. 龙虾机票下单完整流程 / Longxia Flight Booking Flow

这是本项目最复杂、最易出错的部分。**下单不是一步，而是三步**（全部在 `POST /api/orders` 的 `item_type==='flight'` 分支内串行完成）：

```
① 验价 pricing   POST https://api.longxiachuxing.com/open/v1/flight/pricing
   输入: { search_offer_id, passengers:[...] }   ← passengers 必须是【数组】
   输出: { offer_id: "fo_xxx", ... }              ← 得到可下单的正式 offer_id
        │  （前端传来的 offer_id 是 "fs_" 开头的搜索ID，不能直接下单）
        ▼
② 下单 create    POST https://api.longxiachuxing.com/open/v1/flight/order/create
   输入: { offer_id:"fo_xxx", out_trade_no, passengers:[...], contact, pay_mode:"user_pay" }
   输出: { system_no:"RDF...", checkout_url:"https://tripay.cn/xxx", total_amount, ... }
        │  system_no = 龙虾订单号；checkout_url = 收银台链接
        ▼
③ 存库           INSERT INTO orders(... longxia_order_no, pay_url ...)
   longxia_order_no = system_no；pay_url = checkout_url
        ▼
④ 支付           POST /api/orders/:id/pay  →  直接返回 pay_url（收银台链接）
   前端 window.open(pay_url) 跳转龙虾收银台，用户自选微信/支付宝支付
        ▼
⑤ 状态同步        GET /api/orders/:id 或 /sync-status
   调用龙虾 order/detail，pay_status==='paid' 时把本地 status 置为 'paid'
```

### 龙虾请求字段规范（严格，错一个就 400/50001）

**passengers 数组，每个元素**：
```json
{
  "type": "adult",            // adult / child / infant
  "name": "张三",
  "id_type": "ID_CARD",       // 必须【大写】：ID_CARD / PASSPORT / ...
  "id_number": "身份证号",     // 注意字段名是 id_number，不是 id_card
  "birthday": "2004-07-18",   // YYYY-MM-DD，必填
  "phone": "手机号",
  "nationality_code": "CN",
  "sex": 1                    // 整数 1=男 0=女，不能是 null/字符串
}
```

**contact 对象**: `{ "name", "phone", "email" }`（email 可为空串）

**pricing 请求的 passengers 也是上面这个数组格式**，不是 `{adult:1,child:0}` 计数对象。

> 后端 `worker-with-proxy.js` 已实现兼容层：会把前端传的 `id_card→id_number`、小写 `id_card→ID_CARD`，并在缺失 `sex`/`birthday` 时从身份证号自动推断（第17位奇偶定性别，7–14位取生日）。修改时不要破坏这个兼容逻辑。

### 关于支付方式的重要决策
龙虾 `order/pay` 接口返回的是**微信 JSAPI 参数**（app_id/nonce_str/package/pay_sign），只能在微信内置浏览器 + JS-SDK 环境调起，普通 Web 浏览器无法使用。
**因此本项目采用 `checkout_url`（收银台链接）方案**：下单即拿到收银台 URL，支付时直接跳转，用户在龙虾收银台自选支付方式。这是 Web 场景下最简单可靠的做法。除非要做微信内 H5，否则不要改回 JSAPI 参数方案。

---

## 8. 数据库结构 / Database (Cloudflare D1)

数据库名 `concert-itinerary-db`，绑定名 `DB`。核心表 `orders` 关键列：

| 列 | 用途 |
|----|------|
| `order_no` | 本地商户订单号 |
| `user_id`, `item_type`, `item_name`, `total_amount`, `status` | 通用订单字段。status: pending/paid/cancelled |
| `pay_url` | 支付链接（机票=龙虾收银台 checkout_url）|
| `longxia_order_no` | 龙虾订单号 system_no |
| `offer_id`, `search_offer_id` | 报价/搜索 ID |
| `passenger_name`, `passenger_id_card`, `passenger_phone` | 乘客信息 |
| `contact_name`, `contact_phone` | 联系人 |
| `flight_no`, `departure_time`, `arrival_time`, `pnr` | 航班信息 |

### ⚠️ 修改生产库结构的正确方式
本地 `init-db.js` 改表**对生产无效**。给 D1 加列必须执行：
```bash
wrangler d1 execute concert-itinerary-db --remote \
  --command "ALTER TABLE orders ADD COLUMN 新列名 TEXT DEFAULT '';"

# 查看表结构验证
wrangler d1 execute concert-itinerary-db --remote --command "PRAGMA table_info(orders);"
```
> 历史教训：新增机票字段时只跑了本地 init-db，导致生产报 `table orders has no column named longxia_order_no`。改表后务必用 `--remote` 同步 D1。

---

## 9. 已知问题与技术债 / Known Issues & Tech Debt

1. **Token 非标准 JWT**: 登录 token 实为 `btoa(JSON.stringify({id,username,role}))`，前端 `atob` 解析。无签名验证，**存在安全隐患**，生产化前应换成真正的 JWT（`JWT_SECRET` 已预留）。
2. **密码明文存储**: 部分注册/登录路径直接比对明文密码（`password_hash` 存了明文）。应统一改用 bcrypt。
3. **密钥明文入库**: `wrangler.toml` 含真实 `LONGXIA_TOKEN`。上传 GitHub 前必须移除并改用 secret。
4. **CORS 全开放**: `Access-Control-Allow-Origin: *`，生产应收敛到指定域名。
5. **两条下单路径重复**: index.html 与 flight-booking.html 逻辑重复，改动需同步（见 §2.3）。
6. **遗留文件多**: `src/` 下多个 worker*.js 和整个 `routes/` 目录未使用，建议清理以免误导。
7. **offer_id 有效期 10 分钟**: 搜索到下单超时会导致下单失败，属正常业务限制。

---

## 10. 调试建议 / Debugging Tips

- **首选 `wrangler tail`** 看后端实时日志。机票下单链路已埋了详细 `console.log`（原始入参、乘客信息、验价请求/响应、下单请求/响应），排错时按顺序看即可定位是哪一步失败。
- 龙虾返回的 `code`: `0`=成功，`40001`=参数错误（看 message 里的字段名），`50001`=下单失败（多为 offer_id 过期/未验价/售罄）。
- 前端问题优先看浏览器 Network 面板的 `POST /api/orders` 请求体，确认字段名与 §7 规范一致。
- 改完记得**分别部署**后端(`wrangler deploy`)和前端(`wrangler pages deploy`)，两者独立。

---

## 11. 给接手者的任务提示 / For Whoever Continues This

当前状态：机票"搜索→验价→下单→存库→跳转收银台"链路已跑通。可继续的方向：
- [ ] 支付完成后的状态回调闭环验证（`/api/payment/notify` 是否被龙虾真正回调）
- [ ] 火车/酒店/打车下单接入（目前仅机票走通了完整龙虾流程）
- [ ] 安全加固：真 JWT + bcrypt + 密钥入 secret + CORS 收敛（见 §9）
- [ ] 清理 §2/§9 提到的遗留文件
- [ ] 多乘客下单支持（当前前端表单仅收集 1 名乘客）

**修改任何机票/订单逻辑前，请先读完 §2 和 §7。**

