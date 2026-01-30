# 迁移策略与实现计划

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 1.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity Claude Opus 4.5 |
| 目的 | desktop_old → desktop 迁移的详细实现计划 |

---

## 1. 项目概述

### 1.1 迁移目标

将 `desktop_old` (基于 Element Plus 的 MVP) 重构为 `desktop` (基于 vue-vben-admin + electron-vite 的新架构)。

### 1.2 核心原则

1. **功能完整迁移** - 100% 保留 desktop_old 的功能
2. **不考虑兼容性** - 可以完全重写，不需要兼容旧代码
3. **更好的架构** - 使用 Vben Admin 的企业级架构模式
4. **现代化技术栈** - 使用最新的 Electron 39 + Vue 3.5.27

---

## 2. 技术栈决策

### 2.1 构建工具选择

| 选项 | 描述 | 优缺点 | 推荐 |
|------|------|--------|------|
| **electron-vite** | desktop_old 使用的工具 | 成熟稳定，配置简单 | ✅ 推荐 |
| **vite-plugin-electron** | electron-v5 使用的工具 | 灵活但配置复杂 | ❌ |

**决策**: 继续使用 **electron-vite**，与 desktop_old 保持一致。

### 2.2 UI 框架选择

| 选项 | 描述 | 优缺点 | 推荐 |
|------|------|--------|------|
| **Element Plus** | desktop_old 使用 | 简单直接，但不够企业级 | ❌ |
| **Ant Design Vue** | Vben Admin 默认 | 企业级组件，生态完善 | ✅ 推荐 |
| **Naive UI** | Vben Admin 支持 | 轻量但组件较少 | ❌ |

**决策**: 使用 **Ant Design Vue 4.2.6**。

### 2.3 是否使用 Vben Admin Monorepo

| 选项 | 描述 | 优缺点 | 推荐 |
|------|------|--------|------|
| **独立项目** | 不依赖 monorepo | 简单，但需要手动集成 Vben 功能 | ❌ |
| **提取核心包** | 从 vue-vben-admin-main 提取需要的包 | 获得核心功能，保持灵活 | ✅ 推荐 |
| **完整 monorepo** | 在 monorepo 内创建 app | 过于复杂 | ❌ |

**决策**: **提取核心包** (@vben/layouts, @vben/common-ui 等)。

---

## 3. 架构设计

### 3.1 目录结构

```
desktop/
├── electron.vite.config.ts          # 构建配置
├── electron-builder.yml             # 打包配置
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.renderer.json
├── src/
│   ├── main/                        # === 主进程 ===
│   │   ├── index.ts                 # 入口
│   │   │
│   │   ├── window/                  # 窗口管理
│   │   │   ├── MainWindow.ts        # 主窗口
│   │   │   ├── BrowserViewManager.ts # 视图管理器
│   │   │   └── TabBarView.ts        # 标签栏
│   │   │
│   │   ├── whatsapp/                # WhatsApp 核心
│   │   │   ├── WhatsAppAccountManager.ts
│   │   │   ├── WhatsAppBrowserView.ts
│   │   │   ├── WhatsAppSessionManager.ts
│   │   │   ├── WhatsAppViewManager.ts
│   │   │   └── WhatsAppMessageHistory.ts
│   │   │
│   │   ├── ipc/                     # IPC 通信
│   │   │   ├── handlers/            # Handler 实现
│   │   │   │   ├── account.ts
│   │   │   │   ├── message.ts
│   │   │   │   └── window.ts
│   │   │   └── index.ts             # IPC 注册
│   │   │
│   │   ├── services/                # 服务层
│   │   │   ├── EventService.ts
│   │   │   ├── StoreService.ts
│   │   │   └── LoggerService.ts
│   │   │
│   │   └── utils/                   # 工具函数
│   │       ├── paths.ts
│   │       └── debug.ts
│   │
│   ├── preload/                     # === Preload ===
│   │   ├── index.ts                 # Admin View preload
│   │   └── whatsapp/                # WhatsApp preload
│   │       ├── index.ts
│   │       ├── injectors/
│   │       │   └── wa-js-injector.ts
│   │       ├── events/
│   │       │   └── whatsapp-event-listener.ts
│   │       └── commands/
│   │           └── command-handler.ts
│   │
│   ├── renderer/                    # === 渲染进程 ===
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts              # Vue 入口
│   │       ├── App.vue              # 根组件
│   │       │
│   │       ├── router/              # 路由配置
│   │       │   └── index.ts
│   │       │
│   │       ├── store/               # Pinia 状态
│   │       │   ├── index.ts
│   │       │   └── modules/
│   │       │       ├── app.ts
│   │       │       ├── user.ts
│   │       │       └── whatsapp.ts  # WhatsApp 状态
│   │       │
│   │       ├── api/                 # API 层
│   │       │   ├── http.ts          # Axios 实例
│   │       │   ├── backend/         # 后端 API
│   │       │   └── electron/        # Electron IPC API
│   │       │       ├── index.ts
│   │       │       ├── whatsapp.ts
│   │       │       └── tabs.ts
│   │       │
│   │       ├── views/               # 页面
│   │       │   ├── dashboard/
│   │       │   │   └── DashboardPage.vue
│   │       │   ├── whatsapp/
│   │       │   │   ├── accounts/
│   │       │   │   │   └── AccountManager.vue
│   │       │   │   └── messages/
│   │       │   │       └── MessageCenter.vue
│   │       │   └── settings/
│   │       │       └── SettingsPage.vue
│   │       │
│   │       ├── components/          # 业务组件
│   │       │   ├── account/
│   │       │   │   ├── AccountCard.vue
│   │       │   │   └── AccountStatusBadge.vue
│   │       │   └── common/
│   │       │       └── WindowControls.vue
│   │       │
│   │       ├── layouts/             # 布局
│   │       │   └── AdminLayout.vue
│   │       │
│   │       ├── styles/              # 样式
│   │       │   └── index.scss
│   │       │
│   │       └── utils/               # 工具
│   │           └── index.ts
│   │
│   └── shared/                      # === 共享代码 ===
│       ├── ipc/
│       │   └── channels.ts          # IPC 通道定义
│       └── types/
│           └── index.ts             # 共享类型定义
│
├── resources/                       # 资源文件
│   ├── icon.icns
│   ├── icon.ico
│   ├── icon.png
│   └── wa-js/                       # WA-JS 文件
│       ├── wppconnect-wa.js
│       └── wapi.js
│
└── out/                             # 构建输出
    ├── main/
    ├── preload/
    └── renderer/
```

### 3.2 进程架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  MainWindow     │  │ BrowserView    │  │ WhatsApp        │     │
│  │  (frameless)   │  │ Manager       │  │ AccountManager │     │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘     │
│          │                   │                   │               │
│          └───────────────────┴───────────────────┘               │
│                              │                                   │
│                    ┌─────────┴─────────┐                         │
│                    │   EventService    │                         │
│                    │   (中央事件总线)   │                         │
│                    └─────────┬─────────┘                         │
└──────────────────────────────┼─────────────────────────────────┘
                               │ IPC
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   TabBar View     │  │   Admin View      │  │  WhatsApp Views  │
│   (Inline HTML)   │  │   (Vben Admin)   │  │  (WA Web + WA-JS)│
│                  │  │                  │  │                  │
│   独立 preload    │  │   Admin preload  │  │  WA preload     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 4. 迁移清单

### 4.1 Phase 1: 项目初始化 (Day 1)

| 任务 | 优先级 | 复杂度 | 时间估计 |
|------|--------|--------|----------|
| 初始化 electron-vite 项目 | P0 | 低 | 0.5h |
| 配置 TypeScript | P0 | 低 | 0.5h |
| 安装依赖 | P0 | 低 | 0.5h |
| 配置 electron-builder | P0 | 中 | 1h |

### 4.2 Phase 2: 主进程架构 (Day 2-3)

| 任务 | 来源 | 复杂度 | 时间估计 |
|------|------|--------|----------|
| MainWindow 创建 | desktop_old/main.ts | 低 | 1h |
| BrowserViewManager 迁移 | desktop_old 699行 | 高 | 4h |
| WhatsAppAccountManager 迁移 | desktop_old 253行 | 高 | 3h |
| WhatsAppBrowserView 迁移 | desktop_old 325行 | 高 | 3h |
| WhatsAppSessionManager 迁移 | desktop_old | 中 | 2h |
| WhatsAppViewManager 迁移 | desktop_old | 中 | 2h |
| EventService 迁移 | desktop_old | 中 | 2h |
| IPC Handlers 注册 | desktop_old | 中 | 2h |

### 4.3 Phase 3: Preload 层 (Day 4)

| 任务 | 来源 | 复杂度 | 时间估计 |
|------|------|--------|----------|
| Admin preload | desktop_old/preload | 低 | 1h |
| WhatsApp preload index | desktop_old | 中 | 2h |
| WA-JS injector | desktop_old | 高 | 3h |
| Event listener | desktop_old | 中 | 2h |
| Command handler | desktop_old | 中 | 2h |

### 4.4 Phase 4: 渲染进程 (Day 5-7)

| 任务 | 复杂度 | 时间估计 |
|------|--------|----------|
| Vue + Router + Pinia 初始化 | 低 | 1h |
| Ant Design Vue 配置 | 低 | 1h |
| Electron API 桥接层 | 中 | 3h |
| AdminLayout 组件 | 中 | 3h |
| WindowControls 组件 | 低 | 1h |
| Dashboard 页面 | 低 | 2h |
| AccountManager 页面 | 高 | 4h |
| MessageCenter 页面 | 中 | 3h |
| Settings 页面 | 低 | 2h |
| WhatsApp Store 模块 | 中 | 2h |

### 4.5 Phase 5: 测试与优化 (Day 8)

| 任务 | 复杂度 | 时间估计 |
|------|--------|----------|
| 功能测试 | 中 | 4h |
| 构建测试 | 低 | 2h |
| 性能优化 | 低 | 2h |

---

## 5. 核心代码迁移指南

### 5.1 BrowserViewManager 迁移

**源文件**: `desktop_old/src/main/BrowserViewManager.ts` (699行)

**关键改动**:
1. 保持核心逻辑不变
2. 更新导入路径
3. 添加更完善的类型定义
4. 优化 TabBar HTML 模板（使用 Ant Design 风格）

**迁移步骤**:
```
1. 复制到 desktop/src/main/window/BrowserViewManager.ts
2. 更新所有 import 路径
3. 更新 TAB_BAR_HEIGHT 常量（可能需要调整）
4. 更新 TabBar 的 inline HTML 样式
5. 添加 ESLint 规则修复
```

### 5.2 WhatsAppAccountManager 迁移

**源文件**: `desktop_old/src/main/whatsapp/WhatsAppAccountManager.ts` (253行)

**关键改动**:
1. 保持业务逻辑不变
2. 更新类型定义
3. 添加更好的错误处理

**迁移步骤**:
```
1. 复制到 desktop/src/main/whatsapp/WhatsAppAccountManager.ts
2. 更新 import 路径
3. 更新回调接口类型
4. 增强错误信息
```

### 5.3 Preload 脚本迁移

**源文件**: `desktop_old/src/preload/`

**关键改动**:
1. 保持 WA-JS 注入逻辑
2. 保持反检测逻辑
3. 更新 contextBridge API 暴露

---

## 6. 依赖列表

### 6.1 生产依赖

```json
{
  "dependencies": {
    "@vueuse/core": "^13.1.0",
    "@wppconnect-team/wppconnect": "^1.37.8",
    "ant-design-vue": "^4.2.6",
    "axios": "^1.9.0",
    "dayjs": "^1.11.13",
    "pinia": "^3.0.2",
    "pinia-plugin-persistedstate": "^4.2.0",
    "vue": "^3.5.27",
    "vue-i18n": "^11.1.3",
    "vue-router": "^4.5.1"
  }
}
```

### 6.2 开发依赖

```json
{
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@types/node": "^22.15.3",
    "@vitejs/plugin-vue": "^5.2.3",
    "electron": "^39.2.7",
    "electron-builder": "^26.0.12",
    "electron-vite": "^5.0.0",
    "sass": "^1.87.0",
    "typescript": "^5.8.3",
    "unplugin-auto-import": "^20.3.0",
    "unplugin-vue-components": "^30.0.0",
    "vite": "^7.3.0"
  }
}
```

---

## 7. 验证计划

### 7.1 功能验证

| 功能 | 测试方法 | 预期结果 |
|------|----------|----------|
| 窗口创建 | 启动应用 | 无边框窗口正常显示 |
| 标签栏 | 查看顶部区域 | TabBar 正常渲染 |
| 账号列表 | 进入 AccountManager | 可正常显示账号列表 |
| 创建账号 | 点击创建按钮 | 新账号添加到列表 |
| 启动账号 | 点击启动按钮 | WhatsApp 视图加载，标签创建 |
| 扫码登录 | 使用手机扫码 | 状态变为 LoggedIn |
| 消息接收 | 收到消息 | Renderer 收到事件 |
| 关闭账号 | 点击关闭按钮 | 视图销毁，标签移除 |

### 7.2 构建验证

```bash
# 开发模式
pnpm run dev

# 构建
pnpm run build

# 打包 Mac
pnpm run build:mac

# 打包 Windows
pnpm run build:win
```

---

## 8. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| WA-JS 兼容性 | 中 | 高 | 保持原有注入逻辑 |
| Electron 版本冲突 | 低 | 中 | 使用与 desktop_old 相同版本 |
| CSP 问题 | 中 | 高 | 复用原有 CSP 处理逻辑 |
| 性能问题 | 低 | 中 | 保持原有优化策略 |

---

## 9. 时间线

```
Day 1: 项目初始化 + 基础配置
Day 2: 主进程 - 窗口管理 + BrowserViewManager
Day 3: 主进程 - WhatsApp 管理模块
Day 4: Preload 层 - 所有 preload 脚本
Day 5: 渲染进程 - 基础框架 + 布局
Day 6: 渲染进程 - 账号管理页面
Day 7: 渲染进程 - 消息/设置页面
Day 8: 测试 + 优化 + 修复
```

**总计**: 8 工作日

---

## 10. 相关文档

- [001. 分支对比分析](./antigravity-claudeOpus4.5-001-vben-comparison.md)
- [003. 实现细节](./antigravity-claudeOpus4.5-003-implementation-details.md)
- [004. 架构设计](./antigravity-claudeOpus4.5-004-architecture.md)
