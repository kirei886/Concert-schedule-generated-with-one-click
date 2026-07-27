# 📚 文档导航

> 演唱会行程生成器 - 完整文档索引

---

## 📖 文档结构

```
111/
├── README.md                          # 项目主文档
│
└── docs/
    ├── 📁 deployment/                 # 部署相关
    ├── 📁 development/                # 开发文档
    ├── 📁 analytics/                  # 数据分析
    ├── 📁 troubleshooting/            # 问题排查
    ├── 📁 features/                   # 功能实现
    ├── 📁 implementation/             # 实现细节
    └── 📁 archive/                    # 历史文档归档
```

---

## 🚀 快速导航

### 新手入门

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 项目介绍、功能特性、快速开始 |
| [快速开始](development/quick-start.md) | 5分钟快速启动指南 |
| [本地开发](development/local-setup.md) | 本地环境搭建详解 |

### 部署上线

| 文档 | 说明 |
|------|------|
| [Cloudflare 部署](deployment/cloudflare.md) | ⭐ Workers + D1 完整部署指南 |
| [部署检查清单](deployment/checklist.md) | 上线前必查项目 |
| [快速部署](deployment/quick-deploy.md) | 传统服务器部署方案 |
| [Cloudflare 迁移](deployment/cloudflare-migration.md) | 从传统架构迁移到 Cloudflare |
| [Workers 实现计划](deployment/workers-plan.md) | Workers 技术实现方案 |

### 开发参考

| 文档 | 说明 |
|------|------|
| [项目配置](development/configuration.md) | ⭐ 环境变量、API 密钥等配置 |
| [系统设计](development/design.md) | 整体架构设计 |
| [数据库设计](development/database.md) | 完整 Schema 和 ER 图 |
| [API 参考](development/api-reference.md) | 前后端 API 接口文档 |
| [快速参考](development/quick-reference.md) | 常用命令和 API 速查 |
| [数据库迁移](development/migration-guide.md) | 迁移脚本使用指南 |
| [项目结构](development/project-structure.md) | 代码组织和版本控制 |
| [Agent 指南](development/agent-guide.md) | AI 开发助手使用指南 |

### 问题排查

| 文档 | 说明 |
|------|------|
| [快速调试](troubleshooting/quick-debug.md) | 常见问题快速解决 |
| [龙虾 API 诊断](troubleshooting/LONGXIA-API-DIAGNOSIS.md) | 第三方 API 问题诊断 |
| [订单创建调试](troubleshooting/ORDER-CREATION-DEBUG-GUIDE.md) | 订单流程问题排查 |
| [支付调试指南](troubleshooting/HOW-TO-TRIGGER-LONGXIA-PAYMENT.md) | 支付功能调试 |
| [酒店订单分析](troubleshooting/HOTEL-ORDER-CREATION-FAILURE-ANALYSIS.md) | 酒店订单问题深度分析 |

### 数据分析

| 文档 | 说明 |
|------|------|
| [数据追踪](analytics/tracking.md) | 用户行为和业务数据分析 |

### 功能实现

| 文档 | 说明 |
|------|------|
| [澳门功能总结](features/MACAU-IMPLEMENTATION-SUMMARY.md) | 澳门线路实现文档 |
| [澳门功能部署](features/MACAU-FEATURE-FINAL-DEPLOYMENT.md) | 澳门功能上线记录 |
| [澳门测试指南](features/MACAU-TEST-GUIDE.md) | 澳门功能测试文档 |

---

## 🎯 使用场景

### 场景 1: 我是新开发者

**推荐阅读顺序：**
1. [README.md](../README.md) - 了解项目
2. [系统设计](development/design.md) - 理解架构
3. [数据库设计](development/database.md) - 了解数据模型
4. [本地开发](development/local-setup.md) - 搭建环境
5. [快速参考](development/quick-reference.md) - 日常开发速查

### 场景 2: 我要部署到生产环境

**推荐阅读顺序：**
1. [Cloudflare 部署](deployment/cloudflare.md) - 完整部署流程
2. [部署检查清单](deployment/checklist.md) - 上线前检查
3. [数据追踪](analytics/tracking.md) - 配置数据分析

### 场景 3: 遇到 Bug 需要调试

**推荐步骤：**
1. 查看 [快速调试](troubleshooting/quick-debug.md) - 快速定位
2. 搜索 `docs/troubleshooting/` 目录 - 查找相关错误
3. 参考具体问题的分析文档

### 场景 4: 开发新功能

**推荐参考：**
1. [API 参考](development/api-reference.md) - 了解现有接口
2. [系统设计](development/design.md) - 保持架构一致
3. `docs/implementation/` - 查看实现示例
4. `docs/features/` - 参考功能开发案例

---

## 📂 详细目录

### 📁 docs/deployment/ - 部署文档

- `cloudflare.md` - Cloudflare Workers + D1 完整部署指南 ⭐
- `cloudflare-migration.md` - Cloudflare 迁移文档
- `workers-plan.md` - Workers 实现计划
- `guide.md` - 通用部署指南
- `quick-deploy.md` - 快速部署方案
- `checklist.md` - 部署检查清单

### 📁 docs/development/ - 开发文档

- `configuration.md` - ⭐ 项目配置指南（环境变量、API 密钥）
- `design.md` - 系统架构设计
- `database.md` - 数据库设计文档
- `api-reference.md` - API 接口文档
- `local-setup.md` - 本地开发环境搭建
- `quick-start.md` - 快速开始指南
- `quick-reference.md` - 快速参考手册
- `migration-guide.md` - 数据库迁移指南
- `project-structure.md` - 项目结构说明
- `agent-guide.md` - AI 开发助手指南

### 📁 docs/analytics/ - 数据分析

- `tracking.md` - 数据追踪和分析文档

### 📁 docs/troubleshooting/ - 问题排查

**通用调试：**
- `quick-debug.md` - 快速调试指南
- `DEBUG-STEPS.md` - 调试步骤
- `LONGXIA-API-DIAGNOSIS.md` - 龙虾 API 诊断
- `ORDER-CREATION-DEBUG-GUIDE.md` - 订单创建调试

**酒店相关：**
- `HOTEL-ORDER-CREATION-FAILURE-ANALYSIS.md` - 订单创建失败
- `HOTEL-PAYMENT-DEBUG-ANALYSIS.md` - 支付调试
- `HOTEL-OFFER-ID-FIX-COMPLETE.md` - Offer ID 修复
- `HOTEL-DETAIL-API-FAILURE-ANALYSIS.md` - 详情 API 失败
- `HOTEL-SOLD-OUT-ERROR-ANALYSIS.md` - 售罄错误
- `HOTEL-40005-ERROR-DEEP-ANALYSIS.md` - 40005 错误分析
- `HOTEL-SEARCH-OFFER-ID-ANALYSIS-COMPLETE.md` - 搜索分析
- `HOTEL-EMPTY-ROOM-TYPES-ANALYSIS.md` - 空房型分析
- `HOTEL-PAYMENT-IMPLEMENTATION-COMPLETE.md` - 支付实现完成

**支付相关：**
- `HOW-TO-TRIGGER-LONGXIA-PAYMENT.md` - 支付流程触发

**其他错误：**
- `50001-ERROR-SOLUTION.md` - 50001 错误解决
- `GUESTS-UNDEFINED-ERROR-ANALYSIS.md` - Guests 未定义
- `PAYLOAD-ANALYSIS.md` - 请求载荷分析

### 📁 docs/features/ - 功能文档

- `MACAU-IMPLEMENTATION-SUMMARY.md` - 澳门功能实现总结
- `MACAU-FEATURE-FINAL-DEPLOYMENT.md` - 澳门功能最终部署
- `MACAU-TEST-GUIDE.md` - 澳门功能测试指南
- `MACAU-QUICK-REFERENCE.md` - 澳门功能快速参考
- `MACAU-ZHUHAI-UPDATE.md` - 澳门珠海功能更新

### 📁 docs/implementation/ - 实现细节

**支付实现：**
- `PAYMENT-COMPLETE-IMPLEMENTATION.md`
- `PAYMENT-IMPLEMENTATION-GUIDE.md`
- `PAYMENT-UI-DOCUMENTATION.md`
- `PAYMENT-FIX-SUMMARY.md`
- `LONGXIA-PAYMENT-IMPLEMENTED.md`
- `LONGXIA-PAYMENT-FIX.md`

**机票实现：**
- `LONGXIA-FLIGHT-IMPLEMENTATION-PLAN.md`
- `LONGXIA-FLIGHT-API-REQUIREMENTS.md`
- `LONGXIA-FLIGHT-PHASE1-COMPLETE.md`
- `LONGXIA-FLIGHT-COMPLETE.md`

**字段修复：**
- `FIELD-MAPPING-COMPLETE.md`
- `FIELD-COMPATIBILITY-FIX.md`
- `PASSENGER-FIELDS-FIX.md`
- `CONTACT-PARAM-FIX.md`
- `PARAM-FIX-SUMMARY.md`

**其他功能：**
- `ADMIN-CONCERTS-FIX.md`
- `MESSAGES-BOARD-FIX.md`
- `REGISTER-FIX-COMPLETE.md`
- `INDEX-HTML-FIX.md`
- `FINAL-FIX-SUMMARY.md`

### 📁 docs/archive/ - 历史归档

历史总结、部署记录、旧版文档等。

---

## 📝 文档维护

### 文档命名规范

- 使用小写字母 + 连字符：`cloudflare-deployment.md`
- 清晰描述文档内容：`database.md` 而非 `db.md`
- 避免缩写和版本号：`guide.md` 而非 `guide-v2.md`

### 创建新文档

1. 确定文档类型，选择对应目录
2. 使用规范的文件名
3. 在文档开头添加标题和说明
4. 更新本索引文件

### 文档分类

| 目录 | 用途 |
|------|------|
| `deployment/` | 部署、上线相关 |
| `development/` | 开发、设计、架构 |
| `analytics/` | 数据分析、追踪 |
| `troubleshooting/` | 问题排查、调试 |
| `features/` | 功能开发记录 |
| `implementation/` | 具体实现细节 |
| `archive/` | 历史文档归档 |

---

## 🔄 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2026-07-27 | 执行文档重组，建立清晰目录结构 |
| 2026-07-27 | 创建 Cloudflare 部署完整文档 |
| 2026-07-27 | 归档历史文档到 archive/ |

---

<div align="center">

**📚 保持文档整洁是团队协作的基础**

[返回项目首页](../README.md)

</div>
