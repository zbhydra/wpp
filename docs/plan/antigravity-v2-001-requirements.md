# 核心需求文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 2.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity |
| 目的 | 定义 desktop 应用的核心需求，用更好的设计重写 |

---

## 1. 项目定位

> [!IMPORTANT]
> **这是一个重写项目，不是迁移项目。**
> 
> 目标是用更优雅的架构、更好的设计来构建一个符合需求的 Electron 应用。
> 可以参考 desktop_old 的业务逻辑，但无需保持任何兼容性。

---

## 2. 核心功能需求

### 2.1 应用概述

一个 Electron 桌面应用，包含：
- **Admin UI**：管理后台，用于管理和监控所有 Tab
- **多 Tab 系统**：每个 Tab 是一个完全隔离的网页容器

### 2.2 应用布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [管理后台] [Tab 1] [Tab 2] [Tab 3] ...                    [─] [□] [×] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                           当前活跃的 View                               │
│                                                                         │
│   切换到不同 Tab 时显示对应内容                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Tab 栏功能

| 功能 | 描述 |
|------|------|
| Tab 切换 | 点击切换到对应 Tab |
| Tab 关闭 | 每个 Tab 可单独关闭 |
| Tab 拖动 | 支持拖动调整 Tab 顺序 |
| 窗口控制 | 最小化、最大化、关闭窗口 |

### 2.4 Tab 隔离要求

每个 Tab 必须满足以下隔离要求：

| 要求 | 描述 |
|------|------|
| **唯一 ID** | 每个 Tab 有唯一标识，如 `account_123` |
| **Session 隔离** | 独立的 Electron partition |
| **Cookie 隔离** | 不共享 cookie |
| **Storage 隔离** | 独立的 localStorage/sessionStorage |
| **代理可配置** | 每个 Tab 可设置独立代理 |
| **状态持久化** | 关闭后再打开，复用之前的登录状态 |

**示例场景**：
```
用户在 tab_id = account_123 的 Tab 上登录了 WhatsApp 账号 A
关闭应用 → 重新打开
打开 tab_id = account_123 → 仍然是账号 A 的登录状态（无需重新扫码）
```

### 2.5 Admin UI 功能

| 功能 | 描述 |
|------|------|
| 查看所有 Tab | 展示所有 Tab 及其状态 |
| 创建 Tab | 创建新的隔离 Tab |
| 关闭 Tab | 关闭指定 Tab |
| 监控状态 | 实时监控 Tab 状态（加载中/已登录/错误等） |
| 与 Tab 通信 | 向 Tab 发送命令，接收 Tab 事件 |

---

## 3. 技术要求

### 3.1 技术栈

| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 桌面框架 | Electron | 39+ | 最新稳定版 |
| 构建工具 | electron-vite | 5.x | Electron 专用构建工具 |
| 前端框架 | vue-vben-admin-main | Latest | 基于 Vue 3 的企业级框架 |
| UI 组件库 | Ant Design Vue | 4.x | Vben Admin 默认 |
| 状态管理 | Pinia | 3.x | Vue 官方推荐 |
| 语言 | TypeScript | 5.x | 类型安全 |

**使用的 Vben Admin 核心包**：

| 包名 | 用途 |
|------|------|
| @vben/layouts | 布局组件（侧边栏、顶栏等） |
| @vben/common-ui | 通用 UI 组件 |
| @vben/preferences | 偏好设置管理 |
| @vben/stores | 状态管理 |
| @vben/hooks | 组合式 API |
| @vben/utils | 工具函数 |

### 3.2 命名规范

> [!NOTE]
> 遵循 vue-vben-admin-main 的命名规范，**全部使用 kebab-case**。

| 类型 | 规范 | 示例 |
|------|------|------|
| TypeScript 文件 | kebab-case | `tab-manager.ts` |
| Vue 组件 | kebab-case | `tab-card.vue` |
| 目录 | kebab-case | `tab-views/` |
| 常量 | SCREAMING_SNAKE_CASE | `IPC_CHANNELS` |

### 3.3 安全要求

| 配置 | 值 | 说明 |
|------|-----|------|
| nodeIntegration | false | 渲染进程不可直接使用 Node |
| contextIsolation | true | 上下文隔离 |
| sandbox | true | 沙箱模式 |

---

## 4. 非功能需求

### 4.1 性能
- 支持同时运行 10+ 个 Tab
- Tab 切换响应时间 < 100ms
- 内存占用合理（每个 Tab 约 100-200MB）

### 4.2 可维护性
- 清晰的模块划分
- 统一的代码风格
- 完善的类型定义

### 4.3 可扩展性
- Tab 模块可支持不同类型的网站
- IPC 通信可扩展更多命令

---

## 5. 相关文档

- [002. 架构设计](./antigravity-v2-002-architecture.md)
- [003. 实现细节](./antigravity-v2-003-implementation.md)
