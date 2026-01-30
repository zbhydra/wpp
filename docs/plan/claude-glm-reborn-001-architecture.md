# WPP Manager 重构架构设计

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | 3.2 (基于 vue-vben-admin) |
| 日期 | 2026-01-30 |
| 状态 | 基于 vue-vben-admin-main 重构 |

---

## 1. 设计原则

### 1.1 核心原则

1. **复用优于重写** - 充分利用 vue-vben-admin 的基础设施
2. **简洁优于复杂** - 能简单就不复杂
3. **职责单一** - 每个模块只做一件事
4. **依赖单向** - 上层依赖下层，下层不感知上层
5. **接口先行** - 先定义接口，再实现
6. **类型安全** - 充分利用 TypeScript
7. **命名规范** - 统一使用 kebab-case

### 1.2 架构目标

| 目标 | 说明 |
|------|------|
| **代码量减少 50%** | 通过复用 vben 实现 |
| **类型覆盖率 100%** | 无 any 类型 |
| **单元测试覆盖率 > 80%** | 核心逻辑必须有测试 |
| **构建时间 < 30s** | 开发体验优先 |
| **启动时间 < 3s** | 性能优化 |
| **开发时间缩短 40%** | 基于 vben 模板 |

---

## 2. 技术栈

### 2.1 最终技术选型

| 分类 | 技术 | 版本 | 理由 |
|------|------|------|------|
| **桌面框架** | Electron | 39.x | 最新稳定版 |
| **构建工具** | Vite + electron-builder | latest | vben 已使用 Vite |
| **包管理** | pnpm + Turbo | 10.x | 与 vben 保持一致 |
| **前端框架** | Vue | 3.5.x | 与 vben 保持一致 |
| **Admin UI** | **vue-vben-admin** | 5.5.x | **作为 renderer 基础** |
| **UI 组件** | Ant Design Vue | 4.2.x | vben 内置 |
| **状态管理** | Pinia | 3.x | vben 内置 |
| **表单处理** | VeeValidate + Zod | latest | vben 内置 |
| **路由** | Vue Router | 4.6.x | vben 内置 |
| **HTTP 客户端** | Axios + @vben/request | latest | vben 内置 |
| **WhatsApp SDK** | @wppconnect/wa-js | latest | 核心依赖 |
| **类型系统** | TypeScript | 5.9.x | 与 vben 保持一致 |

### 2.2 不使用的技术

| 技术 | 不使用原因 |
|------|-----------|
| **electron-vite** | vben 已使用 Vite，不需要额外的构建工具 |
| **创建新 UI** | 直接基于 vben 修改，减少工作量 |
| **额外的状态管理** | Pinia 已足够 |
| **额外的 HTTP 客户端** | vben 的 request 已完善 |

---

## 3. 项目结构

### 3.1 基于 vue-vben-admin 的结构

```
wpp/
└── desktop/                                    # WPP Manager 主目录
    ├── apps/                                   # Vben 应用目录
    │   └── web-antd/                           # WPP Admin UI (基于 vben)
    │       ├── src/
    │       │   ├── views/                        # 页面
    │       │   │   ├── _core/                    # vben 内置页面（保持）
    │       │   │   ├── dashboard/                # vben 内置页面（保持）
    │       │   │   └── wpp/                      # WPP 业务页面（新增）
    │       │   │       ├── accounts/             # 账号管理
    │       │   │       │   └── index.vue
    │       │   │       ├── messages/             # 消息中心
    │       │   │       │   └── index.vue
    │       │   │       └── settings/             # 系统设置
    │       │   │           └── index.vue
    │       │   ├── api/                         # API 层
    │       │   │   └── wpp/                      # WPP API（新增）
    │       │   │       └── index.ts
    │       │   ├── router/                      # 路由
    │       │   │   └── routes/                    # 路由配置
    │       │   │       └── wpp.ts               # WPP 路由（新增）
    │       │   ├── store/                       # 状态管理
    │       │   │   └── modules/                    # 状态模块
    │       │   │       └── wpp.ts               # WPP 状态（新增）
    │       │   ├── layouts/                     # 布局组件
    │       │   │   └── wpp/                      # WPP 布局（新增）
    │       │   │       ├── index.vue              # WPP 主布局
    │       │   │       └── components/            # WPP 布局组件
    │       │   │           └── tab-bar.vue         # 标签栏
    │       │   ├── adapter/                     # 适配器（vben 原有）
    │       │   ├── bootstrap.ts                  # 引导文件（修改）
    │       │   └── main.ts                       # 入口（修改）
    │       ├── package.json                    # 依赖（修改）
    │       └── vite.config.ts                  # Vite 配置（修改）
    │
    ├── electron/                                # Electron 主进程（新增）
    │   ├── main/                                 # 主进程代码
    │   │   ├── app/                            # 应用入口
    │   │   │   ├── main.ts                     # 主入口
    │   │   │   └── lifecycle.ts                # 生命周期管理
    │   │   ├── core/                           # 核心基础设施
    │   │   │   ├── logger/                     # 日志系统
    │   │   │   ├── config/                     # 配置管理
    │   │   │   ├── errors/                     # 错误处理
    │   │   │   └── di/                         # 依赖注入容器
    │   │   ├── window/                        # 窗口管理
    │   │   │   ├── main-window.ts              # 主窗口
    │   │   │   └── view-manager.ts             # 视图管理器
    │   │   ├── whatsapp/                      # WhatsApp 业务
    │   │   │   ├── account-manager.ts         # 账号管理
    │   │   │   ├── session-manager.ts         # 会话管理
    │   │   │   ├── message-manager.ts         # 消息管理
    │   │   │   └── proxy-manager.ts            # 代理管理
    │   │   ├── controllers/                    # 控制器层
    │   │   │   ├── whatsapp-controller.ts   # WhatsApp 控制
    │   │   │   ├── tab-controller.ts          # 标签控制
    │   │   │   └── app-controller.ts           # 应用控制
    │   │   └── ipc/                           # IPC 注册
    │   │       └── register.ts                # IPC 处理器注册
    │   ├── preload/                             # Preload 脚本
    │   │   ├── admin/                          # Admin View preload
    │   │   │   └── index.ts                  # 暴露 Electron API
    │   │   └── whatsapp/                       # WhatsApp View preload
    │   │       ├── index.ts                   # 注入 WA-JS
    │   │       └── types.ts                   # Preload 类型
    │   └── shared/                              # 共享代码
    │       ├── types/                          # 类型定义
    │       │   ├── whatsapp.ts                 # WhatsApp 类型
    │       │   ├── tabs.ts                      # 标签类型
    │       │   ├── ipc.ts                       # IPC 类型
    │       │   └── index.ts                     # 导出
    │       ├── constants/                      # 常量
    │       │   ├── channels.ts                  # IPC 通道
    │       │   ├── events.ts                     # 事件定义
    │       │   └── config.ts                    # 配置常量
    │       └── utils/                          # 工具函数
    │           ├── logger.ts                    # 日志工具
    │           └── format.ts                    # 格式化
    │
    ├── packages/                              # Vben 内置包（保持原样）
    │   ├── @vben/access/                        # 权限控制
    │   ├── @vben/common-ui/                     # 通用 UI 组件
    │   ├── @vben/constants/                     # 常量
    │   ├── @vben/hooks/                          # Hooks
    │   ├── @vben/icons/                          # 图标
    │   ├── @vben/layouts/                        # 布局组件
    │   ├── @vben/locales/                        # 国际化
    │   ├── @vben/plugins/                        # 插件
    │   ├── @vben/preferences/                    # 偏好设置
    │   ├── @vben/request/                        # 请求封装
    │   ├── @vben/stores/                         # 状态管理
    │   ├── @vben/styles/                         # 样式
    │   ├── @vben/types/                          # 类型
    │   ├── @vben/utils/                          # 工具
    │   └── ...                                   # 其他 vben 包
    │
    ├── resources/                             # 资源文件
    │   ├── icons/                               # 图标
    │   └── wa-js/                               # WA-JS 文件
    │
    ├── scripts/                               # 脚本
    │   └── electron/                            # Electron 相关脚本（新增）
    │       ├── dev.ts                           # 开发脚本
    │       └── build.ts                         # 构建脚本
    │
    ├── electron-builder.json                    # Electron 打包配置（新增）
    ├── electron.vite.config.ts                # Electron 构建配置（新增）
    ├── package.json                           # 根 package.json（修改）
    ├── pnpm-workspace.yaml                    # pnpm workspace 配置（修改）
    ├── turbo.json                             # Turbo 配置（保持）
    └── README.md                              # 说明文档
```

### 3.2 与原 vben 结构的差异

**新增目录：**
- `desktop/electron/` - Electron 主进程和 preload
- `desktop/apps/web-antd/src/views/wpp/` - WPP 业务页面
- `desktop/apps/web-antd/src/layouts/wpp/` - WPP 布局

**修改文件：**
- `desktop/apps/web-antd/src/bootstrap.ts` - 添加 Electron API 初始化
- `desktop/apps/web-antd/src/main.ts` - 添加 TabBar 事件监听
- `desktop/apps/web-antd/package.json` - 添加 Electron 相关依赖
- `desktop/package.json` - 添加 Electron 脚本
- `desktop/pnpm-workspace.yaml` - 添加 electron workspace

**保持不变：**
- `desktop/packages/` - 所有 vben 包
- `desktop/apps/web-antd/src/views/_core/` - vben 内置页面
- `desktop/apps/web-antd/src/views/dashboard/` - vben 内置页面

### 3.3 命名规范

**所有文件名统一使用 kebab-case：**

```
✅ 正确:
- main-window.ts
- view-manager.ts
- account-manager.ts
- proxy-manager.ts
- whatsapp-controller.ts
- tab-controller.ts
- tab-bar.vue

❌ 错误:
- MainWindow.ts
- ViewManager.ts
- AccountManager.ts
- ProxyManager.ts
- WhatsAppController.ts
- TabController.ts
- TabBar.vue
```

---

## 4. 核心架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Electron 应用                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Main Process                          │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           Controllers (控制器层)                 │   │    │
│  │  │  • WhatsAppController  (账号/消息控制)           │   │    │
│  │  │  • TabController        (标签控制)               │   │    │
│  │  │  • AppController        (应用控制)               │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                        ↓↓                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           Managers (管理层)                      │   │    │
│  │  │  • AccountManager   (账号管理)                   │   │    │
│  │  │  • SessionManager   (会话管理)                   │   │    │
│  │  │  • MessageManager   (消息管理)                   │   │    │
│  │  │  • ViewManager      (视图管理)                   │   │    │
│  │  │  • ProxyManager     (代理管理)                   │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                        ↓↓                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           Core (核心层)                          │   │    │
│  │  │  • DI Container    (依赖注入)                    │   │    │
│  │  │  • Logger          (日志)                        │   │    │
│  │  │  • Config          (配置)                        │   │    │
│  │  │  • Error Handler   (错误处理)                    │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                        ↕ IPC (类型安全)                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Renderer Process (vue-vben-admin)               │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           WPP Pages (新增)                       │   │    │
│  │  │  • AccountManager  (账号管理)                     │   │    │
│  │  │  • MessageCenter  (消息中心)                     │   │    │
│  │  │  • Settings        (系统设置)                     │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                        ↓↓                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           Vben Pages (内置)                      │   │    │
│  │  │  • Dashboard       (仪表盘)                       │   │    │
│  │  │  • Profile         (个人资料)                     │   │    │
│  │  │  • Authentication (认证)                         │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                        ↓↓                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           Vben Infrastructure                   │   │    │
│  │  │  • @vben/layouts   (布局组件)                    │   │    │
│  │  │  • @vben/stores    (状态管理)                    │   │    │
│  │  │  • @vben/request   (请求封装)                    │   │    │
│  │  │  • @vben/common-ui (UI 组件)                     │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                        ↓↓                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │           WPP Store (新增)                       │   │    │
│  │  │  • useWppStore     (Tab 状态管理)                │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                        ↕ IPC (独立 partition)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            WhatsApp Views (多实例)                       │    │
│  │                                                          │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │    │
│  │  │ Account 1  │  │ Account 2  │  │ Account 3  │        │    │
│  │  │ WA Web +   │  │ WA Web +   │  │ WA Web +   │        │    │
│  │  │ WA-JS      │  │ WA-JS      │  │ WA-JS      │        │    │
│  │  └────────────┘  └────────────┘  └────────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  • 认证  • 用户管理  • 订单管理  • 数据持久化                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 分层说明

**Controller 层（控制器）**
- 职责：处理 IPC 调用，参数验证，返回结果
- 特点：无状态，纯函数调用 Manager
- 位置：`desktop/electron/main/controllers/`

**Manager 层（管理器）**
- 职责：核心业务逻辑，状态管理
- 特点：有状态，可被多个 Controller 使用
- 位置：`desktop/electron/main/whatsapp/` 和 `desktop/electron/main/window/`

**Core 层（核心）**
- 职责：基础设施服务
- 特点：通用能力，被所有层使用
- 位置：`desktop/electron/main/core/`

**Vben Infrastructure（vben 基础设施）**
- 职责：提供 UI、布局、状态管理等通用能力
- 特点：保持不变，直接使用
- 位置：`desktop/packages/`

**WPP Pages（WPP 页面）**
- 职责：WPP 业务逻辑的用户界面
- 特点：基于 vben 组件构建
- 位置：`desktop/apps/web-antd/src/views/wpp/`

---

## 5. 核心模块设计

### 5.1 控制器模式

**位置：** `desktop/electron/main/controllers/`

**设计理由：**
- IPC 调用统一入口
- 参数验证集中处理
- 错误处理统一
- 易于测试

**代码结构：**

```typescript
// desktop/electron/main/controllers/whatsapp-controller.ts
import { z } from 'zod';
import { AccountManager, MessageManager } from '../whatsapp';

export class WhatsAppController {
  constructor(
    private accountManager: AccountManager,
    private messageManager: MessageManager,
  ) {}

  // 获取所有账号
  async getAccounts(): Promise<WhatsAppAccount[]> {
    return this.accountManager.getAll();
  }

  // 创建账号
  async createAccount(data: { name: string }): Promise<string> {
    const schema = z.object({
      name: z.string().min(1).max(50),
    });
    const { name } = schema.parse(data);
    return this.accountManager.create(name);
  }

  // 启动账号
  async startAccount(accountId: string): Promise<void> {
    return this.accountManager.start(accountId);
  }

  // 发送消息
  async sendMessage(data: {
    accountId: string;
    to: string;
    message: string;
  }): Promise<void> {
    const schema = z.object({
      accountId: z.string(),
      to: z.string(),
      message: z.string().min(1).max(4096),
    });
    const { accountId, to, message } = schema.parse(data);
    return this.messageManager.send(accountId, to, message);
  }
}
```

### 5.2 依赖注入（简化版）

**位置：** `desktop/electron/main/core/di/service-container.ts`

**设计理由：**
- 解耦模块依赖
- 便于测试（可注入 Mock）
- 不引入复杂的 DI 框架

**代码结构：**

```typescript
type ServiceFactory<T> = () => T;

export class ServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, ServiceFactory<any>>();

  register<T>(key: string, factory: ServiceFactory<T>): void {
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service ${key} not registered`);
    }

    const service = factory();
    this.services.set(key, service);
    return service;
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}
```

### 5.3 View Manager

**位置：** `desktop/electron/main/window/view-manager.ts`

**设计理由：**
- 管理 Admin View (vben) 和 WhatsApp Views
- 职责单一：视图的创建、切换、移除
- 简化版：200 行左右

**代码结构：**

```typescript
import { BrowserWindow, WebContentsView } from 'electron';
import { join } from 'path';
import type { WhatsAppAccount } from 'desktop/electron/shared/types';
import { ProxyManager } from '../whatsapp/proxy-manager';

export class ViewManager {
  private views = new Map<string, WebContentsView>();
  private activeViewId: string | null = null;

  constructor(
    private mainWindow: BrowserWindow,
    private proxyManager: ProxyManager,
  ) {}

  // 创建 Admin View (加载 vben 应用)
  createAdminView(): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../preload/admin/index.js'),
      },
    });

    // 加载 vben 应用
    const url = process.env.VITE_DEV_SERVER_URL || 'app://./index.html';
    view.webContents.loadURL(url);

    this.addView('admin', view, { x: 0, y: 40, width: 1400, height: 860 });
    return view;
  }

  // 创建 WhatsApp View
  createWhatsAppView(account: WhatsAppAccount): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../preload/whatsapp/index.js'),
        partition: `persist:wa-${account.id}`,
      },
    });

    view.webContents.loadURL('https://web.whatsapp.com');

    this.addView(account.id, view, { x: 0, y: 40, width: 1400, height: 860 });
    return view;
  }

  // 切换视图
  switchView(viewId: string): void {
    this.views.forEach((view, id) => {
      if (id === viewId) {
        const [width, height] = this.mainWindow.getSize();
        view.setBounds({ x: 0, y: 40, width: width || 1400, height: (height || 900) - 40 });
        this.activeViewId = viewId;
      } else {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    });
  }

  // ... 其他方法
}
```

### 5.4 WppStore（基于 Vben Stores）

**位置：** `desktop/apps/web-antd/src/store/modules/wpp.ts`

**设计理由：**
- 利用 vben 的 stores 基础设施
- 管理 Tab 状态
- 与 Electron IPC 通信

**代码结构：**

```typescript
import { defineStore } from '@vben/stores';
import { ref } from 'vue';
import type { Tab } from 'desktop/electron/shared/types/tabs';

export const useWppStore = defineStore('wpp', () => {
  const tabs = ref<Tab[]>([
    {
      id: 'admin',
      type: 'admin',
      title: '管理后台',
      closable: false,
    },
  ]);

  const activeTabId = ref<string>('admin');

  function switchTab(tabId: string) {
    activeTabId.value = tabId;
    window.electronAPI.tabs.switch(tabId);
  }

  async function createNewWhatsAppTab() {
    const tabId = await window.electronAPI.whatsapp.createTab();
    // tabs 会通过事件自动更新
  }

  function closeTab(tabId: string) {
    window.electronAPI.tabs.close(tabId);
  }

  // 监听事件
  function setupListeners() {
    window.electronAPI.tabs.onCreated((tab) => {
      tabs.value.push(tab);
    });

    window.electronAPI.tabs.onClosed((tabId) => {
      const index = tabs.value.findIndex((t) => t.id === tabId);
      if (index > -1) {
        tabs.value.splice(index, 1);
        if (activeTabId.value === tabId) {
          switchTab('admin');
        }
      }
    });
  }

  return {
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    createNewWhatsAppTab,
    setupListeners,
  };
});
```

### 5.5 TabBar 组件

**位置：** `desktop/apps/web-antd/src/layouts/wpp/components/tab-bar.vue`

**设计理由：**
- 显示和管理所有 tabs
- 拖动排序
- 窗口控制

**代码结构：**

```vue
<template>
  <div class="wpp-tab-bar">
    <div class="tabs-container" ref="tabsRef">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        :draggable="tab.type !== 'admin'"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        @click="switchTab(tab.id)"
        @dragstart="onDragStart(tab, $event)"
        @dragover.prevent
        @drop="onDrop(tab, $event)"
        @dragend="onDragEnd"
      >
        <span class="tab-icon">
          <WhatsAppOutlined v-if="tab.type === 'whatsapp'" />
          <DashboardOutlined v-else />
        </span>
        <span class="tab-title">{{ tab.title }}</span>
        <span
          v-if="tab.type !== 'admin'"
          class="tab-close"
          @click.stop="closeTab(tab.id)"
        >
          <CloseOutlined />
        </span>
      </div>

      <div class="tab-action" @click="createNewTab">
        <PlusOutlined />
      </div>
    </div>

    <div class="window-controls">
      <div class="control-btn" @click="minimize">
        <MinusOutlined />
      </div>
      <div class="control-btn" @click="maximize">
        <BorderOutlined v-if="!isMaximized" />
        <CloseSquareOutlined v-else />
      </div>
      <div class="control-btn close" @click="close">
        <CloseOutlined />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useWppStore } from '#/store/modules/wpp';

const wppStore = useWppStore();
const { tabs, activeTabId } = storeToRefs(wppStore);

// ... 拖动排序逻辑
</script>
```

---

## 6. IPC 通信设计

### 6.1 类型安全的 IPC

**位置：** `desktop/electron/shared/types/ipc.ts`

**设计理由：**
- 编译时类型检查
- IDE 自动补全
- 减少运行时错误

**代码结构：**

```typescript
interface IPCInvokeMap {
  'whatsapp:getAccounts': () => WhatsAppAccount[];
  'whatsapp:createAccount': (data: { name: string }) => string;
  'whatsapp:startAccount': (accountId: string) => Promise<void>;
  'whatsapp:stopAccount': (accountId: string) => Promise<void>;
  'whatsapp:deleteAccount': (accountId: string) => Promise<void>;
  'whatsapp:sendMessage': (data: {
    accountId: string;
    to: string;
    message: string;
  }) => Promise<void>;
  'tab:switch': (tabId: string) => void;
  'tab:close': (tabId: string) => void;
}

interface IPCEventMap {
  'account:created': (account: WhatsAppAccount) => void;
  'account:deleted': (accountId: string) => void;
  'account:status': (accountId: string, status: AccountStatus) => void;
  'tab:created': (tab: Tab) => void;
  'tab:closed': (tabId: string) => void;
}

export type { IPCInvokeMap, IPCEventMap };
```

### 6.2 Preload API

**位置：** `desktop/electron/preload/admin/index.ts`

**代码结构：**

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { IPCInvokeMap, IPCEventMap } from 'desktop/electron/shared/types/ipc';

const electronAPI = {
  // WhatsApp 账号
  whatsapp: {
    getAccounts: () => ipcRenderer.invoke('whatsapp:getAccounts'),
    createAccount: (data: Parameters<IPCInvokeMap['whatsapp:createAccount']>[0]) =>
      ipcRenderer.invoke('whatsapp:createAccount', data),
    startAccount: (accountId: string) =>
      ipcRenderer.invoke('whatsapp:startAccount', accountId),
    // ...

    // 事件监听
    onAccountsUpdate: (callback: (accounts: WhatsAppAccount[]) => void) => {
      // ...
    },
  },

  // 标签页
  tabs: {
    switch: (tabId: string) => ipcRenderer.send('tab:switch', tabId),
    close: (tabId: string) => ipcRenderer.send('tab:close', tabId),
    // ...
  },

  // 窗口操作
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
```

---

## 7. 构建配置

### 7.1 Electron 构建配置

**位置：** `desktop/electron.vite.config.ts`

**代码结构：**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 主进程配置
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/app/main.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'electron/shared'),
      },
    },
  },

  // Preload 配置
  preload: {
    build: {
      rollupOptions: {
        input: {
          admin: resolve(__dirname, 'electron/preload/admin/index.ts'),
          whatsapp: resolve(__dirname, 'electron/preload/whatsapp/index.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'electron/shared'),
      },
    },
  },

  // Renderer 配置（使用 vben 的 vite 配置）
  renderer: {
    // 不需要修改，使用 vben 的配置
  },
});
```

### 7.2 electron-builder 配置

**位置：** `desktop/electron-builder.json`

**代码结构：**

```json
{
  "appId": "com.wppmanager.app",
  "productName": "WPP Manager",
  "directories": {
    "output": "release",
    "buildResources": "resources"
  },
  "files": [
    "dist/**/*",
    "apps/web-antd/dist/**/*"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "resources/icons/icon.ico"
  },
  "mac": {
    "target": ["dmg"],
    "icon": "resources/icons/icon.icns",
    "category": "public.app-category.productivity"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "resources/icons",
    "category": "Utility"
  }
}
```

### 7.3 脚本配置

**位置：** `desktop/package.json`

**修改脚本：**

```json
{
  "scripts": {
    // Vben 原有脚本
    "dev": "turbo-run dev",
    "build": "turbo build",
    "lint": "vsh lint",

    // Electron 新增脚本
    "dev:electron": "tsx scripts/electron/dev.ts",
    "build:electron": "tsx scripts/electron/build.ts",
    "build:app": "pnpm build:electron && electron-builder",
    "build:app:win": "pnpm build:app --win",
    "build:app:mac": "pnpm build:app --mac"
  }
}
```

---

## 8. 时间估算

### 8.1 开发阶段

| 阶段 | 内容 | 预估时间 |
|------|------|----------|
| **Phase 1: 项目整合** | 整合 vben 和 electron | 2 天 |
| **Phase 2: 核心层** | DI、日志、配置、错误处理 | 2 天 |
| **Phase 3: 主进程核心** | AccountManager、ViewManager | 4 天 |
| **Phase 4: WhatsApp 集成** | WA-JS 注入、事件监听 | 4 天 |
| **Phase 5: 控制器层** | IPC 注册、Controller 实现 | 2 天 |
| **Phase 6: 渲染进程** | 基于 vben 的 WPP 页面 | 3 天 |
| **Phase 7: TabBar** | 标签栏组件、拖动排序 | 2 天 |
| **Phase 8: 测试** | 单元测试、E2E 测试 | 3 天 |
| **Phase 9: 打包部署** | electron-builder 配置、CI/CD | 2 天 |
| **总计** | | **24 天 ≈ 5 周** |

### 8.2 与原方案对比

| 方面 | 原方案（从头创建） | 新方案（基于 vben） |
|------|------------------|-------------------|
| 开发时间 | 34 天 (7 周) | 24 天 (5 周) |
| 代码量 | 较多 | 较少（复用 vben） |
| UI 稳定性 | 需要验证 | vben 已验证 |
| 功能完整性 | 需要实现 | vben 已提供 |
| 学习曲线 | 较陡 | 较缓 |

---

## 9. 相关文档

- [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- [003. API 设计](./claude-glm-reborn-003-api.md)
- [004. 数据模型](./claude-glm-reborn-004-data-model.md)
- [核心需求](./claude-glm-reborn-core-requirements.md)
