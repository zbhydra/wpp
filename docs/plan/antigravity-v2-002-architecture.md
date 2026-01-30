# 系统架构设计

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 2.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity |
| 目的 | 定义 desktop 应用的系统架构 |

---

## 1. 整体架构

> [!NOTE]
> Renderer 层使用 vue-vben-admin-main 的核心包（@vben/*），获得企业级功能。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Electron 应用                                 │
│                      (Electron 39 + Vue 3.5)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       Main Process                                 │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  main-window    │  │   view-manager   │  │   tab-manager   │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  ipc-handlers   │  │  event-service  │  │  store-service  │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    │ IPC (contextBridge)                │
│                                    │                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Renderer Processes                           │  │
│  │                                                                   │  │
│  │  ┌───────────────┐  ┌─────────────────────────────────────────┐   │  │
│  │  │   Tab Bar     │  │            Content Views                │   │  │
│  │  │ (固定 40px)   │  │                                         │   │  │
│  │  │               │  │  ┌─────────────┐  ┌─────────────────┐   │   │  │
│  │  │ • Tab 列表    │  │  │  Admin UI   │  │   Tab Views     │   │   │  │
│  │  │ • 窗口控制    │  │  │  (Vue 3)   │  │  (隔离网页)      │   │   │  │
│  │  └───────────────┘  │  └─────────────┘  └─────────────────┘   │   │  │
│  │                      └─────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 目录结构

```
desktop/
├── electron.vite.config.ts
├── electron-builder.yml
├── package.json
├── tsconfig.json
│
├── src/
│   ├── main/                           # 主进程
│   │   ├── index.ts                    # 入口
│   │   ├── window/
│   │   │   ├── main-window.ts          # 主窗口
│   │   │   ├── view-manager.ts         # 视图管理
│   │   │   └── tab-bar.ts              # 标签栏
│   │   ├── tabs/
│   │   │   ├── tab-manager.ts          # Tab 生命周期
│   │   │   ├── tab-session.ts          # Session 隔离
│   │   │   ├── tab-proxy.ts            # 代理配置
│   │   │   └── tab-view.ts             # Tab 视图
│   │   ├── ipc/
│   │   │   ├── handlers/
│   │   │   │   ├── tab-handlers.ts
│   │   │   │   ├── window-handlers.ts
│   │   │   │   └── message-handlers.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── event-service.ts
│   │   │   ├── store-service.ts
│   │   │   └── logger-service.ts
│   │   └── utils/
│   │       └── paths.ts
│   │
│   ├── preload/
│   │   ├── admin.ts                     # Admin UI preload
│   │   └── tab/
│   │       ├── index.ts                 # 通用 Tab preload
│   │       └── whatsapp/                # WhatsApp 专用
│   │           ├── wa-js-injector.ts
│   │           └── event-listener.ts
│   │
│   ├── renderer/                        # Admin UI (Vben Admin)
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts
│   │       ├── App.vue
│   │       ├── router/                  # 使用 @vben/router
│   │       ├── store/                   # 使用 @vben/stores
│   │       ├── views/                   # 业务页面
│   │       ├── components/              # 业务组件
│   │       ├── layouts/                 # 使用 @vben/layouts
│   │       └── api/                     # Electron IPC 封装
│   │
│   └── shared/
│       ├── types/
│       │   └── tab.ts
│       └── constants/
│           └── ipc-channels.ts
│
└── resources/
    └── icons/
```

---

## 3. 进程通信

### 3.1 IPC 通道设计

```typescript
// src/shared/constants/ipc-channels.ts

export const IPC_CHANNELS = {
  // Tab 管理
  TAB: {
    CREATE: 'tab:create',
    CLOSE: 'tab:close',
    SWITCH: 'tab:switch',
    GET_ALL: 'tab:get-all',
    GET_STATUS: 'tab:get-status',
    SEND_COMMAND: 'tab:send-command',
    // 事件
    CREATED: 'tab:created',
    CLOSED: 'tab:closed',
    SWITCHED: 'tab:switched',
    STATUS_CHANGED: 'tab:status-changed',
  },
  // 窗口控制
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    IS_MAXIMIZED: 'window:is-maximized',
  },
} as const;
```

### 3.2 通信流程

```
Admin UI                    Main Process                   Tab View
   │                             │                             │
   │── tab:create ──────────────>│                             │
   │                             │── 创建 WebContentsView ────>│
   │                             │<─ did-finish-load ──────────│
   │<─ tab:created ──────────────│                             │
   │                             │                             │
   │── tab:send-command ────────>│                             │
   │                             │── IPC command ─────────────>│
   │                             │<─ IPC response ─────────────│
   │<─ command result ───────────│                             │
```

---

## 4. Tab 隔离机制

### 4.1 Session Partition

```typescript
// 每个 Tab 使用独立的 partition
const partition = `persist:tab-${tabId}`;

// 创建独立 session
const session = electronSession.fromPartition(partition);

// WebContentsView 使用该 session
new WebContentsView({
  webPreferences: {
    session,
    partition,
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

### 4.2 数据存储

```
userData/
├── Partitions/
│   ├── persist:tab-account_001/
│   │   ├── Cookies
│   │   ├── Local Storage/
│   │   └── Session Storage/
│   ├── persist:tab-account_002/
│   │   └── ...
│   └── persist:tab-account_N/
│       └── ...
│
└── app-data/
    └── tabs.json              # Tab 元数据
```

### 4.3 代理配置

```typescript
// 为每个 Tab 配置独立代理
session.setProxy({
  proxyRules: 'socks5://127.0.0.1:1080',
});
```

---

## 5. 视图布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Main Window (无边框)                          │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                         Tab Bar (40px)                               │ │
│ │  [管理后台][Tab 1][Tab 2]...                         [─][□][×]      │ │
│ │  • 可拖拽区域 (-webkit-app-region: drag)                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │                     Content Area (height - 40px)                    │ │
│ │                                                                     │ │
│ │   • 当前活跃视图 (Admin UI 或 Tab View)                             │ │
│ │   • 非活跃视图隐藏但保持状态                                         │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 安全配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `nodeIntegration` | `false` | 禁止渲染进程直接使用 Node |
| `contextIsolation` | `true` | 隔离 preload 上下文 |
| `sandbox` | `true` | 启用沙箱 |
| `webSecurity` | `true` | 启用 Web 安全 |

---

## 7. 相关文档

- [001. 核心需求](./antigravity-v2-001-requirements.md)
- [003. 实现细节](./antigravity-v2-003-implementation.md)
