# 项目调研文档索引

## 调研概述

本次调研对 wpp-manager (WhatsApp Multi-Account Manager) 项目进行了全面的架构和功能分析。项目是一个基于 Electron + FastAPI 的多账号 WhatsApp 管理系统。

---

## 文档列表

| 序号 | 文档 | 描述 |
|------|------|------|
| 001 | [基础架构](./001.basic-architecture.md) | 项目概述、技术栈、整体架构 |
| 002 | [浏览器通信](./002.browser-communication.md) | @wppconnect 集成、WA-JS 注入、CSP 处理 |
| 003 | [服务器端架构](./003.server-architecture.md) | FastAPI 后端架构、API 设计、认证机制 |
| 004 | [桌面端架构](./004.desktop-architecture.md) | Electron 架构、进程模型、视图管理 |
| 005 | [部署与配置](./005.deployment-and-config.md) | 部署流程、配置说明、运维命令 |
| 006 | [桌面端数据流](./006.desktop-data-flow.md) | 桌面端数据流向、状态同步、IPC 事件 |
| 007 | [服务器端数据流](./007.server-data-flow.md) | 服务器端数据流向、认证流程、Redis 数据结构 |

---

## 项目结构概览

```
wpp/
├── desktop_old/              # 桌面端应用
│   ├── src/
│   │   ├── main/            # Electron 主进程
│   │   │   ├── BrowserViewManager.ts
│   │   │   └── whatsapp/    # WhatsApp 管理
│   │   ├── renderer/        # Vue 渲染进程
│   │   ├── preload/         # Preload 脚本
│   │   └── shared/          # 共享代码
│   └── package.json
│
├── server/                  # 后端服务
│   ├── src/
│   │   └── app/
│   │       ├── api/         # API 路由
│   │       ├── core/        # 核心配置
│   │       ├── models/      # 数据模型
│   │       ├── services/    # 业务逻辑
│   │       └── middleware/  # 中间件
│   ├── deploy/              # 部署脚本
│   └── config.yaml
│
└── docs/
    └── research/            # 调研文档（当前目录）
```

---

## 核心技术栈

### 桌面端

| 技术 | 用途 |
|------|------|
| Electron 39 | 桌面应用框架 |
| Vue 3.5 | 前端 UI 框架 |
| Element Plus 2.13 | UI 组件库 |
| TypeScript 5.7 | 类型系统 |
| @wppconnect-team/wppconnect 1.37 | WhatsApp 集成 |

### 服务器端

| 技术 | 用途 |
|------|------|
| FastAPI 0.124 | Web 框架 |
| SQLAlchemy 2.0 | ORM (异步) |
| MySQL | 关系型数据库 |
| Redis 7.1 | 缓存/会话存储 |
| Uvicorn | ASGI 服务器 |

---

## 核心功能

### 1. 多账号管理

- 每个 WhatsApp 账号使用独立的 `partition: persist:wa-{accountId}`
- 完全隔离的会话状态
- 支持同时运行多个账号

### 2. 浏览器视图管理

- 单窗口多视图架构
- TabBar + Admin View + WhatsApp Views
- 动态视图切换

### 3. WhatsApp 自动化

- WA-JS 注入机制
- 事件监听 (登录/登出/消息)
- 消息发送/接收

### 4. 用户认证

- JWT Token 认证
- Access Token (24h) + Refresh Token (7天)
- Redis Token 存储

### 5. 订单管理

- 订单创建/查询
- 支付集成
- 状态机管理

---

## 架构亮点

### 1. 清晰的分层架构

```
桌面端:
  Main Process ← IPC → Renderer Process
  ← IPC → WhatsApp Views

服务器端:
  API Layer → Service Layer → Data Layer
```

### 2. 会话隔离机制

- 每个 WhatsApp 账号独立 partition
- Cookie、LocalStorage 完全隔离
- 互不干扰的会话数据

### 3. 事件驱动通信

- 三层事件总线
- Renderer ↔ Main ↔ WhatsApp View
- 统一的 EventService

### 4. 中间件洋葱模型

```
RequestLogging → CrossOrigin → ErrorHandling → Route Handler
```

### 5. 零停机部署

- GitHub Actions + SSH + Supervisor
- 备份 → 更新 → 重启 → 健康检查
- 支持快速回滚

---

## 关键文件索引

### 桌面端核心文件

| 文件 | 功能 |
|------|------|
| `desktop_old/src/main/BrowserViewManager.ts` | 视图管理核心 |
| `desktop_old/src/main/whatsapp/WhatsAppAccountManager.ts` | 账号管理 |
| `desktop_old/src/main/whatsapp/WhatsAppBrowserView.ts` | WA 视图封装 |
| `desktop_old/src/main/services/EventService.ts` | 事件转发 |
| `desktop_old/src/shared/ipc/channels.ts` | IPC 通道定义 |
| `desktop_old/src/preload/whatsapp-preload/injectors/wa-js-injector.ts` | WA-JS 注入 |

### 服务器端核心文件

| 文件 | 功能 |
|------|------|
| `server/src/app/main.py` | 应用入口 |
| `server/src/app/core/config.py` | 配置管理 |
| `server/src/app/core/database.py` | 数据库连接 |
| `server/src/app/middleware/error_handling.py` | 异常处理 |
| `server/src/app/services/user_auth_service.py` | 认证服务 |
| `server/src/app/api/client/auth_client.py` | 认证 API |

---

## 下一步建议

### 功能增强

1. **消息功能扩展**
   - 群发消息
   - 定时发送
   - 消息模板

2. **联系人管理**
   - 联系人分组
   - 标签管理
   - 快速回复

3. **数据分析**
   - 消息统计
   - 活跃度分析
   - 数据导出

### 技术优化

1. **性能优化**
   - 懒加载未激活视图
   - 虚拟滚动大列表
   - 连接池调优

2. **测试覆盖**
   - 桌面端 E2E 测试
   - 服务器端单元测试
   - 集成测试

3. **监控告警**
   - 性能监控
   - 错误追踪
   - 日志聚合

---

## 调研方法

本次调研采用了以下方法：

1. **静态分析**
   - 目录结构分析
   - 代码阅读
   - 配置文件解析

2. **动态分析**
   - 启动流程追踪
   - IPC 通信监听
   - 数据流向分析

3. **架构提取**
   - 核心模块识别
   - 依赖关系映射
   - 设计模式总结

---

## 调研时间

- 开始时间: 2025-01-29
- 完成时间: 2025-01-29
- 调研方式: 静态分析 + Code Explorer Agent

---

## 相关资源

- [Electron 官方文档](https://www.electronjs.org/)
- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [@wppconnect-team/wppconnect](https://github.com/wppconnect-team/wppconnect)
- [Vue 3 官方文档](https://vuejs.org/)
