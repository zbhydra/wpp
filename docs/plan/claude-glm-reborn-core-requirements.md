# WPP Manager 核心需求架构设计

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | 3.2 (基于 vue-vben-admin) |
| 日期 | 2026-01-30 |
| 状态 | 基于 vue-vben-admin-main 重构 |

---

## 核心需求

### 1. 应用结构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 应用窗口                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TabBar (标签切换栏)                      │   │
│  │  [Admin] [Tab1] [Tab2] [Tab3] [...] [+] [-] [□] [×]  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │            当前激活的 View (Admin 或 WhatsApp)        │   │
│  │                                                       │   │
│  │         ┌─────────────────────────┐                  │   │
│  │         │   www.whatsapp.com     │                  │   │
│  │         │   (独立 partition)     │                  │   │
│  │         │   (独立代理可选)       │                  │   │
│  │         └─────────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术选型调整

### 1.1 最终技术栈

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

### 1.2 架构调整说明

**原方案 vs 新方案：**

| 方面 | 原方案 | 新方案 (基于 vben) |
|------|--------|-------------------|
| Renderer | 自己创建 Vue 应用 | 基于 vue-vben-admin-main |
| UI 组件 | Ant Design Vue | vben 内置的 Ant Design Vue |
| 布局 | 自己实现 | vben layouts |
| 路由 | 自己配置 | vben router |
| 状态管理 | 自己配置 Pinia | vben stores |
| API 层 | 自己实现 | vben @vben/request |
| 构建工具 | electron-vite | Vite + electron-builder |

---

## 项目结构（基于 vue-vben-admin）

### 2.1 整体结构

```
wpp/
└── desktop/                           # WPP Manager 主目录
    ├── apps/                        # Vben 应用目录
    │   └── web-antd/                # WPP Admin UI (基于 vben)
    │       ├── src/
    │       │   ├── views/           # 页面
    │       │   │   ├── _core/       # vben 内置页面（保持）
    │       │   │   ├── dashboard/   # vben 内置页面（保持）
    │       │   │   └── wpp/         # WPP 业务页面（新增）
    │       │   │       ├── accounts/    # 账号管理
    │       │   │       │   └── index.vue
    │       │   │       ├── messages/    # 消息中心
    │       │   │       │   └── index.vue
    │       │   │       └── settings/    # 系统设置
    │       │   │           └── index.vue
    │       │   ├── api/                # API 层
    │       │   │   └── wpp/            # WPP API（新增）
    │       │   │       └── index.ts
    │       │   ├── router/             # 路由
    │       │   │   └── routes/         # 路由配置
    │       │   │       └── wpp.ts      # WPP 路由（新增）
    │       │   ├── store/              # 状态管理
    │       │   │   └── modules/        # 状态模块
    │       │   │       └── wpp.ts      # WPP 状态（新增）
    │       │   ├── layouts/            # 布局组件
    │       │   │   └── wpp/            # WPP 布局（新增）
    │       │   │       ├── index.vue   # WPP 主布局
    │       │   │       └── components/ # WPP 布局组件
    │       │   │           └── tab-bar.vue  # 标签栏
    │       │   ├── adapter/            # 适配器（vben 原有）
    │       │   ├── bootstrap.ts        # 引导文件（修改）
    │       │   └── main.ts             # 入口（修改）
    │       ├── package.json           # 依赖（修改）
    │       └── vite.config.ts         # Vite 配置（修改）
    │
    ├── electron/                     # Electron 主进程（新增）
    │   ├── main/                      # 主进程代码
    │   │   ├── app/                   # 应用入口
    │   │   │   ├── main.ts            # 主入口
    │   │   │   └── lifecycle.ts       # 生命周期管理
    │   │   ├── core/                  # 核心基础设施
    │   │   │   ├── logger/            # 日志系统
    │   │   │   ├── config/            # 配置管理
    │   │   │   ├── errors/            # 错误处理
    │   │   │   └── di/                # 依赖注入容器
    │   │   ├── window/                # 窗口管理
    │   │   │   ├── main-window.ts     # 主窗口
    │   │   │   └── view-manager.ts    # 视图管理器
    │   │   ├── whatsapp/              # WhatsApp 业务
    │   │   │   ├── account-manager.ts # 账号管理
    │   │   │   ├── session-manager.ts # 会话管理
    │   │   │   ├── message-manager.ts # 消息管理
    │   │   │   └── proxy-manager.ts   # 代理管理
    │   │   ├── controllers/           # 控制器层
    │   │   │   ├── whatsapp-controller.ts  # WhatsApp 控制
    │   │   │   ├── tab-controller.ts       # 标签控制
    │   │   │   └── app-controller.ts        # 应用控制
    │   │   └── ipc/                   # IPC 注册
    │   │       └── register.ts        # IPC 处理器注册
    │   ├── preload/                   # Preload 脚本
    │   │   ├── admin/                 # Admin View preload
    │   │   │   └── index.ts           # 暴露 Electron API
    │   │   └── whatsapp/              # WhatsApp View preload
    │   │       ├── index.ts           # 注入 WA-JS
    │   │       └── types.ts           # Preload 类型
    │   └── shared/                    # 共享代码
    │       ├── types/                 # 类型定义
    │       │   ├── whatsapp.ts        # WhatsApp 类型
    │       │   ├── tabs.ts            # 标签类型
    │       │   ├── ipc.ts             # IPC 类型
    │       │   └── index.ts           # 导出
    │       ├── constants/             # 常量
    │       │   ├── channels.ts        # IPC 通道
    │       │   ├── events.ts          # 事件定义
    │       │   └── config.ts          # 配置常量
    │       └── utils/                # 工具函数
    │           ├── logger.ts          # 日志工具
    │           └── format.ts          # 格式化
    │
    ├── packages/                     # Vben 内置包（保持原样）
    │   ├── @vben/access/              # 权限控制
    │   ├── @vben/common-ui/           # 通用 UI 组件
    │   ├── @vben/constants/           # 常量
    │   ├── @vben/hooks/               # Hooks
    │   ├── @vben/icons/               # 图标
    │   ├── @vben/layouts/             # 布局组件
    │   ├── @vben/locales/             # 国际化
    │   ├── @vben/plugins/             # 插件
    │   ├── @vben/preferences/         # 偏好设置
    │   ├── @vben/request/             # 请求封装
    │   ├── @vben/stores/              # 状态管理
    │   ├── @vben/styles/              # 样式
    │   ├── @vben/types/               # 类型
    │   ├── @vben/utils/               # 工具
    │   └── ...                        # 其他 vben 包
    │
    ├── resources/                    # 资源文件
    │   ├── icons/                    # 图标
    │   └── wa-js/                    # WA-JS 文件
    │
    ├── scripts/                      # 脚本
    │   └── electron/                 # Electron 相关脚本（新增）
    │       ├── dev.ts                # 开发脚本
    │       └── build.ts              # 构建脚本
    │
    ├── electron-builder.json         # Electron 打包配置（新增）
    ├── electron.vite.config.ts       # Electron 构建配置（新增）
    ├── package.json                  # 根 package.json（修改）
    ├── pnpm-workspace.yaml           # pnpm workspace 配置（修改）
    ├── turbo.json                    # Turbo 配置（保持）
    └── README.md                     # 说明文档
```

### 2.2 关键目录说明

**apps/web-antd/** - WPP Admin UI
- 基于 vue-vben-admin 的 web-antd 模板
- 添加 WPP 业务页面和路由
- 利用 vben 的布局、组件、状态管理等基础设施

**electron/main/** - Electron 主进程
- 独立于 vben 的主进程代码
- 负责窗口管理、WhatsApp 集成、IPC 通信等
- 文件命名统一使用 kebab-case

**electron/preload/** - Preload 脚本
- Admin View preload: 暴露安全的 Electron API 给 vben 应用
- WhatsApp View preload: 注入 WA-JS，处理 WhatsApp 事件

**electron/shared/** - 共享代码
- 类型定义、常量、工具函数
- 在主进程和渲染进程之间共享

**packages/** - Vben 内置包
- 保持原样，不做修改
- 提供基础设施支持

---

## 核心模块设计

### 3.1 TabBar 组件（关键）

**位置：** `desktop/apps/web-antd/src/layouts/wpp/components/tab-bar.vue`

**功能：**
- 显示所有打开的 tabs（Admin + WhatsApp tabs）
- 点击切换 tab
- 关闭按钮（Admin 除外）
- 拖动排序
- 新建按钮
- 窗口控制按钮

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
        <span v-if="tab.status" class="tab-status" :class="`status-${tab.status}`" />
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
import { ref, computed } from 'vue';
import { useWppStore } from '#/store/modules/wpp';

const wppStore = useWppStore();
const { tabs, activeTabId } = storeToRefs(wppStore);

// ... 拖动排序逻辑
</script>
```

### 3.2 ProxyManager（新增）

**位置：** `desktop/electron/main/whatsapp/proxy-manager.ts`

**功能：**
- 为每个 tab 配置独立代理
- 支持 HTTP/SOCKS5 代理
- PAC 脚本支持

**代码结构：**

```typescript
export interface ProxyConfig {
  type?: 'http' | 'https' | 'socks5' | 'pac';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  pacScript?: string;
  bypassList?: string[];
}

export class ProxyManager {
  private proxyConfigs = new Map<string, ProxyConfig>();

  setProxy(tabId: string, config: ProxyConfig): void {
    this.proxyConfigs.set(tabId, config);
  }

  getProxy(tabId: string): ProxyConfig | undefined {
    return this.proxyConfigs.get(tabId);
  }

  removeProxy(tabId: string): void {
    this.proxyConfigs.delete(tabId);
  }

  // 应用代理到 session
  applyProxy(session: Session, tabId: string): void {
    const config = this.getProxy(tabId);
    if (!config) {
      session.setProxy({ mode: 'direct' });
      return;
    }

    if (config.type === 'pac') {
      session.setProxy({
        mode: 'pac_script',
        pacScript: config.pacScript!,
      });
    } else {
      session.setProxy({
        mode: 'fixed_servers',
        proxyRules: `${config.type}://${config.host}:${config.port}`,
      });
    }
  }
}
```

### 3.3 WppStore（状态管理，基于 Pinia）

**位置：** `desktop/apps/web-antd/src/store/modules/wpp.ts`

**功能：**
- 管理所有 tabs 状态
- 拖动排序
- tab 生命周期

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

  // 切换 tab
  function switchTab(tabId: string) {
    activeTabId.value = tabId;
    window.electronAPI.tabs.switch(tabId);
  }

  // 创建新的 WhatsApp tab
  async function createNewWhatsAppTab() {
    const tabId = await window.electronAPI.whatsapp.createTab();
    // tabs 会通过事件自动更新
  }

  // 关闭 tab
  function closeTab(tabId: string) {
    window.electronAPI.tabs.close(tabId);
  }

  // 拖动排序
  function reorderTabs(draggedId: string, droppedId: string) {
    const draggedIndex = tabs.value.findIndex((t) => t.id === draggedId);
    const droppedIndex = tabs.value.findIndex((t) => t.id === droppedId);

    const [draggedTab] = tabs.value.splice(draggedIndex, 1);
    tabs.value.splice(droppedIndex, 0, draggedTab);

    // 通知主进程更新顺序
    window.electronAPI.tabs.reorder(tabs.value.map((t) => t.id));
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

    window.electronAPI.tabs.onUpdated((tab) => {
      const index = tabs.value.findIndex((t) => t.id === tab.id);
      if (index > -1) {
        tabs.value[index] = { ...tabs.value[index], ...tab };
      }
    });
  }

  return {
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    createNewWhatsAppTab,
    reorderTabs,
    setupListeners,
  };
});
```

### 3.4 ViewManager（优化版）

**位置：** `desktop/electron/main/window/view-manager.ts`

**功能：**
- 管理 Admin View 和多个 WhatsApp Views
- 切换视图显示/隐藏
- 应用代理配置

**代码结构：**

```typescript
import { BrowserWindow, session } from 'electron';
import { join } from 'path';
import type { Tab, WhatsAppTab } from 'desktop/electron/shared/types/tabs';
import { ProxyManager } from '../whatsapp/proxy-manager';

export class ViewManager {
  private views = new Map<string, WebContentsView>();
  private activeViewId: string | null = null;

  constructor(
    private mainWindow: BrowserWindow,
    private proxyManager: ProxyManager,
  ) {}

  // 创建 Admin View
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

    this.addView('admin', view);
    return view;
  }

  // 创建 WhatsApp View
  async createWhatsAppView(tab: WhatsAppTab): Promise<WebContentsView> {
    // 创建独立的 session
    const ses = session.fromPartition(tab.partition);

    // 应用代理
    this.proxyManager.applyProxy(ses, tab.id);

    // 设置 User-Agent
    await ses.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 修改 CSP（允许 WA-JS 注入）
    ses.webRequest.onHeadersReceived((details, callback) => {
      if (details.responseHeaders) {
        const csp = details.responseHeaders['content-security-policy'] || [];
        if (csp.length > 0) {
          details.responseHeaders['content-security-policy'] = [
            csp[0]
              .replace("script-src 'self'", "script-src 'self' 'unsafe-inline' wapp-assets:")
              .replace("connect-src 'self'", "connect-src 'self' wss://*.whatsapp.net"),
          ];
        }
      }
      callback({ cancel: false, responseHeaders: details.responseHeaders });
    });

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../preload/whatsapp/index.js'),
        session: ses,
        webSecurity: true,
      },
    });

    view.webContents.loadURL('https://web.whatsapp.com');

    this.addView(tab.id, view);
    return view;
  }

  private addView(id: string, view: WebContentsView): void {
    this.views.set(id, view);
    this.mainWindow.contentView.addChildView(view);
  }

  // 切换视图
  switchView(viewId: string): void {
    // 隐藏所有视图
    this.views.forEach((view) => {
      view.setBounds({ x: 0, y: 48, width: 0, height: 0 });
    });

    // 显示目标视图
    const view = this.views.get(viewId);
    if (view) {
      const [width, height] = this.mainWindow.getSize();
      view.setBounds({ x: 0, y: 48, width: width || 1400, height: (height || 900) - 48 });
      this.activeViewId = viewId;
    }
  }

  // 移除视图
  removeView(viewId: string): void {
    const view = this.views.get(viewId);
    if (view) {
      this.mainWindow.contentView.removeChildView(view);
      view.webContents.destroy();
      this.views.delete(viewId);
    }
  }

  // 获取视图
  getView(viewId: string): WebContentsView | undefined {
    return this.views.get(viewId);
  }

  // 清理所有视图
  clear(): void {
    this.views.forEach((view) => {
      this.mainWindow.contentView.removeChildView(view);
      view.webContents.destroy();
    });
    this.views.clear();
    this.activeViewId = null;
  }
}
```

### 3.5 TabController（新增）

**位置：** `desktop/electron/main/controllers/tab-controller.ts`

**功能：**
- 处理 tab 相关的 IPC 调用
- 创建/关闭/切换/排序 tabs

**代码结构：**

```typescript
import { z } from 'zod';
import { ViewManager } from '../window/view-manager';
import { AccountManager } from '../whatsapp/account-manager';
import { ProxyManager } from '../whatsapp/proxy-manager';
import type { WhatsAppTab, Tab } from 'desktop/electron/shared/types/tabs';

export class TabController {
  constructor(
    private viewManager: ViewManager,
    private accountManager: AccountManager,
    private proxyManager: ProxyManager,
  ) {}

  // 创建新的 WhatsApp tab
  async createWhatsAppTab(data: {
    name: string;
    proxy?: ProxyConfig;
  }): Promise<Tab> {
    const schema = z.object({
      name: z.string().min(1).max(50),
      proxy: z.object({
        type: z.enum(['http', 'socks5']),
        host: z.string(),
        port: z.number(),
      }).optional(),
    });

    const { name, proxy } = schema.parse(data);

    // 创建账号（tab）
    const accountId = await this.accountManager.create(name);

    // 设置代理
    if (proxy) {
      this.proxyManager.setProxy(accountId, proxy);
    }

    // 创建视图
    await this.viewManager.createWhatsAppView({
      id: accountId,
      type: 'whatsapp',
      title: name,
      status: 'stopped',
      partition: `persist:wa-${accountId}`,
      closable: true,
    });

    return {
      id: accountId,
      type: 'whatsapp',
      title: name,
      status: 'stopped',
      closable: true,
    };
  }

  // 关闭 tab
  async closeTab(tabId: string): Promise<void> {
    await this.accountManager.stop(tabId);
    await this.accountManager.delete(tabId);
    this.viewManager.removeView(tabId);
  }

  // 切换 tab
  switchTab(tabId: string): void {
    this.viewManager.switchView(tabId);
  }

  // 排序 tabs
  reorderTabs(tabIds: string[]): void {
    // 保存顺序到配置
    // this.configManager.set('tabOrder', tabIds);
  }

  // 设置代理
  async setProxy(tabId: string, proxy: ProxyConfig): Promise<void> {
    this.proxyManager.setProxy(tabId, proxy);

    // 如果 tab 已创建，需要重启应用代理
    const view = this.viewManager.getView(tabId);
    if (view) {
      const ses = view.webContents.session;
      this.proxyManager.applyProxy(ses, tabId);
      view.webContents.reload();
    }
  }

  // 获取 tab 状态
  getTabStatus(tabId: string): string {
    const account = this.accountManager.get(tabId);
    return account?.status || 'unknown';
  }

  // 与 tab 通信
  async sendCommandToTab(tabId: string, command: string, data: any): Promise<any> {
    const view = this.viewManager.getView(tabId);
    if (!view) {
      throw new Error(`Tab ${tabId} not found`);
    }

    view.webContents.send(`wa:command:${tabId}`, command, data);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

      const handler = (_event: any, result: any) => {
        clearTimeout(timeout);
        if (result.success) {
          resolve(result.data);
        } else {
          reject(result.error);
        }
      };

      view.webContents.on(`wa:result:${tabId}`, handler);
    });
  }
}
```

---

## 共享类型定义

**文件：** `desktop/electron/shared/types/tabs.ts`

```typescript
export type TabType = 'admin' | 'whatsapp';

export type TabStatus = 'stopped' | 'starting' | 'qr' | 'ready' | 'logged_in' | 'logged_out' | 'error';

export interface BaseTab {
  id: string;
  type: TabType;
  title: string;
  closable: boolean;
}

export interface AdminTab extends BaseTab {
  type: 'admin';
  id: 'admin';
  title: '管理后台';
  closable: false;
}

export interface WhatsAppTab extends BaseTab {
  type: 'whatsapp';
  id: string;  // accountId
  title: string;  // 账号名称
  status: TabStatus;
  closable: true;
  partition: string;  // persist:wa-{id}
  proxy?: ProxyConfig;
}

export type Tab = AdminTab | WhatsAppTab;

export interface ProxyConfig {
  type: 'http' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}
```

---

## IPC 通道定义

**文件：** `desktop/electron/shared/types/ipc.ts`

```typescript
export interface IPCInvokeMap {
  // Tab 操作
  'tab:create': (data: { name: string; proxy?: ProxyConfig }) => Promise<Tab>;
  'tab:close': (tabId: string) => Promise<void>;
  'tab:switch': (tabId: string) => void;
  'tab:reorder': (tabIds: string[]) => void;
  'tab:getStatus': (tabId: string) => Promise<TabStatus>;
  'tab:setProxy': (tabId: string, proxy: ProxyConfig) => Promise<void>;

  // 与 tab 通信
  'tab:sendCommand': (tabId: string, command: string, data: any) => Promise<any>;

  // 窗口操作
  'window:minimize': () => void;
  'window:maximize': () => void;
  'window:close': () => void;
}

export interface IPCEventMap {
  'tab:created': (tab: Tab) => void;
  'tab:closed': (tabId: string) => void;
  'tab:updated': (tab: Tab) => void;
  'tab:status': (tabId: string, status: TabStatus) => void;
}
```

---

## WPP 页面设计（基于 vben）

### 4.1 账号管理页面

**位置：** `desktop/apps/web-antd/src/views/wpp/accounts/index.vue`

**功能：**
- 账号列表展示
- 创建账号
- 启动/停止账号
- 删除账号
- 设置代理

**使用 vben 组件：**
- `VbenTable` - 表格
- `VbenButton` - 按钮
- `VbenModal` - 模态框
- `VbenForm` - 表单

### 4.2 消息中心页面

**位置：** `desktop/apps/web-antd/src/views/wpp/messages/index.vue`

**功能：**
- 消息列表
- 消息发送
- 消息统计

### 4.3 系统设置页面

**位置：** `desktop/apps/web-antd/src/views/wpp/settings/index.vue`

**功能：**
- 全局设置
- 代理管理
- 日志查看

---

## WPP 路由配置

**位置：** `desktop/apps/web-antd/src/router/routes/wpp.ts`

```typescript
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/wpp',
    name: 'Wpp',
    component () {
      return import('#/layouts/wpp/index.vue');
    },
    meta: {
      title: 'WPP Manager',
      icon: 'mdi:whatsapp',
    },
    children: [
      {
        path: '',
        redirect: '/wpp/accounts',
      },
      {
        path: 'accounts',
        name: 'WppAccounts',
        component: () => import('#/views/wpp/accounts/index.vue'),
        meta: {
          title: '账号管理',
          icon: 'mdi:account-group',
        },
      },
      {
        path: 'messages',
        name: 'WppMessages',
        component: () => import('#/views/wpp/messages/index.vue'),
        meta: {
          title: '消息中心',
          icon: 'mdi:message-text',
        },
      },
      {
        path: 'settings',
        name: 'WppSettings',
        component: () => import('#/views/wpp/settings/index.vue'),
        meta: {
          title: '系统设置',
          icon: 'mdi:cog',
        },
      },
    ],
  },
];

export default routes;
```

---

## WPP API 层

**位置：** `desktop/apps/web-antd/src/api/wpp/index.ts`

```typescript
import { requestClient } from '#/api/request';

export namespace AccountApi {
  // 获取账号列表
  export function getAccounts() {
    return requestClient.get<WhatsAppAccount[]>('/whatsapp/accounts');
  }

  // 创建账号
  export function createAccount(data: { name: string }) {
    return requestClient.post<string>('/whatsapp/accounts', data);
  }

  // 启动账号
  export function startAccount(accountId: string) {
    return requestClient.post(`/whatsapp/accounts/${accountId}/start`);
  }

  // 停止账号
  export function stopAccount(accountId: string) {
    return requestClient.post(`/whatsapp/accounts/${accountId}/stop`);
  }

  // 删除账号
  export function deleteAccount(accountId: string) {
    return requestClient.delete(`/whatsapp/accounts/${accountId}`);
  }

  // 设置代理
  export function setProxy(accountId: string, proxy: ProxyConfig) {
    return requestClient.post(`/whatsapp/accounts/${accountId}/proxy`, proxy);
  }
}

export namespace MessageApi {
  // 发送消息
  export function sendMessage(data: {
    accountId: string;
    to: string;
    message: string;
  }) {
    return requestClient.post('/whatsapp/messages/send', data);
  }

  // 获取聊天列表
  export function getChats(accountId: string) {
    return requestClient.get<Chat[]>(`/whatsapp/accounts/${accountId}/chats`);
  }
}

// Electron API 直接调用
export const electronAPI = window.electronAPI;
```

---

## 完整流程示例

### 场景：创建新的 WhatsApp tab

```
1. 用户点击 TabBar 上的 "+" 按钮
   ↓
2. Renderer: wppStore.createNewWhatsAppTab()
   ↓
3. IPC: tab:create({ name: "Account 1" })
   ↓
4. Main: TabController.createWhatsAppTab()
   ├─ AccountManager.create("Account 1")
   │  └─ 生成唯一 ID: "account_123"
   ├─ ViewManager.createWhatsAppView()
   │  ├─ 创建独立 session: persist:wa-account_123
   │  ├─ 应用代理（如果有）
   │  ├─ 修改 CSP
   │  └─ 加载 https://web.whatsapp.com
   └─ 发送事件: tab:created
   ↓
5. Renderer: 接收 tab:created 事件
   └─ tabs.value.push(newTab)
   ↓
6. 用户看到新 tab 出现，点击切换
   ↓
7. IPC: tab:switch("account_123")
   ↓
8. Main: ViewManager.switchView("account_123")
   └─ 显示 WhatsApp Web，其他视图隐藏
   ↓
9. 用户扫描二维码登录
   ↓
10. WhatsApp View 注入的 WA-JS 检测到登录
    ↓
11. 发送事件: wa:login:account_123
    ↓
12. Main: AccountManager 更新状态
    ↓
13. 发送事件: tab:status("account_123", "logged_in")
    ↓
14. Renderer: TabBar 显示绿色状态图标
```

---

## 时间估算（基于 vben）

| 阶段 | 内容 | 时间 |
|------|------|------|
| **Phase 1: 项目整合** | 整合 vben 和 electron | 2 天 |
| **Phase 2: 核心层** | DI、日志、错误、类型 | 2 天 |
| **Phase 3: ViewManager** | 视图管理、代理支持 | 3 天 |
| **Phase 4: TabBar 组件** | 拖动排序、窗口控制 | 2 天 |
| **Phase 5: WhatsApp 集成** | WA-JS 注入、事件监听 | 4 天 |
| **Phase 6: Controller 层** | IPC 处理 | 2 天 |
| **Phase 7: WPP 页面** | 基于 vben 的业务页面 | 3 天 |
| **Phase 8: 测试** | 功能验证 | 3 天 |
| **Phase 9: 打包** | electron-builder | 2 天 |
| **总计** | | **23 天 ≈ 4.5 周** |

---

## 总结

### 核心改进

1. **基于 vue-vben-admin** - 利用成熟的后台模板，减少开发工作量
2. **TabBar 组件** - 完整实现拖动排序、窗口控制
3. **ProxyManager** - 每个 tab 独立代理支持
4. **TabController** - 专门处理 tab 操作
5. **类型定义** - 清晰的 Tab 类型系统

### 你的需求覆盖

| 需求 | 实现方式 |
|------|----------|
| Electron 应用 | ✅ |
| 启动后打开 Admin UI | ✅ 默认显示 admin tab |
| 多个 WhatsApp tabs | ✅ 动态创建 |
| 每个 tab 完全隔离 | ✅ partition: persist:wa-{id} |
| 独立 cookie/user data | ✅ session 隔离 |
| **独立代理** | ✅ ProxyManager + session.setProxy |
| 唯一 ID 持久化 | ✅ accountId + SessionManager |
| 上方 tabs 切换栏 | ✅ TabBar 组件 |
| tabs 支持关闭 | ✅ closeable 属性 |
| **tabs 支持拖动排序** | ✅ draggable + reorderTabs |
| 窗口操作 | ✅ window-controls |
| Admin UI 打开/关闭 tabs | ✅ TabController |
| Admin UI 监控 tab 状态 | ✅ 事件监听 |
| Admin UI 与 tab 通信 | ✅ sendCommandToTab |

### 与原方案对比

| 方面 | 原方案 | 新方案（基于 vben） |
|------|--------|-------------------|
| 开发时间 | ~7 周 | ~4.5 周 |
| 代码量 | 较多 | 较少（复用 vben） |
| UI 稳定性 | 需要自己验证 | vben 已验证 |
| 功能完整性 | 需要自己实现 | vben 已提供很多功能 |
| 学习曲线 | 较陡 | 较缓（vben 文档完善） |

---

是否需要我进一步调整方案，或开始实施？
