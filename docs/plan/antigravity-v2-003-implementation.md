# 实现细节

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 2.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity |
| 目的 | 定义 desktop 应用的核心模块实现规格 |

---

> [!IMPORTANT]
> Renderer 层使用 vue-vben-admin-main 的核心包 (@vben/*)，不是纯 Vue 3 项目。

## 1. 主进程核心模块

### 1.1 main-window.ts

```typescript
// src/main/window/main-window.ts
import { BrowserWindow, app } from 'electron';
import { join } from 'path';

export interface MainWindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

const DEFAULT_CONFIG: MainWindowConfig = {
  width: 1440,
  height: 900,
  minWidth: 1024,
  minHeight: 768,
};

export function createMainWindow(config = DEFAULT_CONFIG): BrowserWindow {
  const window = new BrowserWindow({
    ...config,
    frame: false,           // 无边框
    show: false,            // 等待 ready-to-show
    webPreferences: {
      preload: join(__dirname, '../preload/admin.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 单实例锁
  if (!app.requestSingleInstanceLock()) {
    app.quit();
  }

  window.once('ready-to-show', () => {
    window.maximize();
    window.show();
  });

  return window;
}
```

---

### 1.2 tab-manager.ts

```typescript
// src/main/tabs/tab-manager.ts
import { TabView } from './tab-view';
import { TabSession } from './tab-session';

export interface Tab {
  id: string;
  name: string;
  url: string;
  status: TabStatus;
  proxy?: ProxyConfig;
}

export enum TabStatus {
  Stopped = 'stopped',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

export interface TabConfig {
  id: string;
  name: string;
  url: string;
  proxy?: ProxyConfig;
}

export class TabManager {
  private tabs: Map<string, Tab> = new Map();
  private views: Map<string, TabView> = new Map();

  constructor(
    private viewManager: ViewManager,
    private eventService: EventService,
  ) {}

  async createTab(config: TabConfig): Promise<Tab> {
    const { id, name, url, proxy } = config;

    // 1. 创建 Tab 元数据
    const tab: Tab = {
      id,
      name,
      url,
      status: TabStatus.Loading,
      proxy,
    };

    // 2. 创建隔离的 Session
    const session = TabSession.create(id, proxy);

    // 3. 创建 TabView
    const view = new TabView(id, session);
    
    // 4. 加载 URL
    await view.load(url);

    // 5. 添加到 ViewManager
    this.viewManager.addTabView(id, view.getWebContentsView());

    // 6. 更新状态
    tab.status = TabStatus.Ready;
    this.tabs.set(id, tab);
    this.views.set(id, view);

    // 7. 通知
    this.eventService.notifyTabCreated(tab);

    return tab;
  }

  async closeTab(id: string): Promise<void> {
    const view = this.views.get(id);
    if (view) {
      await view.destroy();
      this.views.delete(id);
    }

    this.tabs.delete(id);
    this.viewManager.removeTabView(id);
    this.eventService.notifyTabClosed(id);
  }

  getTab(id: string): Tab | undefined {
    return this.tabs.get(id);
  }

  getAllTabs(): Tab[] {
    return Array.from(this.tabs.values());
  }

  switchToTab(id: string): void {
    this.viewManager.setActiveView(id);
    this.eventService.notifyTabSwitched(id);
  }
}
```

---

### 1.3 tab-view.ts

```typescript
// src/main/tabs/tab-view.ts
import { WebContentsView, Session } from 'electron';
import { join } from 'path';

export class TabView {
  private view: WebContentsView;

  constructor(
    private id: string,
    private session: Session,
  ) {
    this.view = new WebContentsView({
      webPreferences: {
        preload: this.getPreloadPath(),
        session: this.session,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.setupEventListeners();
  }

  private getPreloadPath(): string {
    // 根据 URL 返回不同的 preload
    // whatsapp.com → whatsapp preload
    // 其他 → 通用 preload
    return join(__dirname, '../preload/tab/index.js');
  }

  private setupEventListeners(): void {
    this.view.webContents.on('did-finish-load', () => {
      console.log(`Tab ${this.id} loaded`);
    });

    this.view.webContents.on('did-fail-load', (_, code, desc) => {
      console.error(`Tab ${this.id} failed: ${code} - ${desc}`);
    });
  }

  async load(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.view.webContents.once('did-finish-load', () => resolve());
      this.view.webContents.once('did-fail-load', (_, code, desc) => 
        reject(new Error(`Load failed: ${code} - ${desc}`))
      );
      this.view.webContents.loadURL(url);
    });
  }

  getWebContentsView(): WebContentsView {
    return this.view;
  }

  async destroy(): Promise<void> {
    this.view.webContents.close();
  }

  sendCommand(command: string, data: any): Promise<any> {
    return this.view.webContents.executeJavaScript(
      `window.__tabAPI?.handleCommand(${JSON.stringify({ command, data })})`
    );
  }
}
```

---

### 1.4 tab-session.ts

```typescript
// src/main/tabs/tab-session.ts
import { session as electronSession, Session } from 'electron';

export interface ProxyConfig {
  type: 'socks5' | 'http';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export class TabSession {
  static create(tabId: string, proxy?: ProxyConfig): Session {
    const partition = `persist:tab-${tabId}`;
    const session = electronSession.fromPartition(partition);

    // 配置代理
    if (proxy) {
      const proxyUrl = `${proxy.type}://${proxy.host}:${proxy.port}`;
      session.setProxy({ proxyRules: proxyUrl });
    }

    return session;
  }

  static getPartition(tabId: string): string {
    return `persist:tab-${tabId}`;
  }
}
```

---

## 2. Preload 层

### 2.1 admin.ts (Admin UI Preload)

```typescript
// src/preload/admin.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc-channels';

const api = {
  tabs: {
    create: (config: TabConfig) => 
      ipcRenderer.invoke(IPC_CHANNELS.TAB.CREATE, config),
    close: (id: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.TAB.CLOSE, id),
    switch: (id: string) => 
      ipcRenderer.send(IPC_CHANNELS.TAB.SWITCH, id),
    getAll: () => 
      ipcRenderer.invoke(IPC_CHANNELS.TAB.GET_ALL),
    sendCommand: (id: string, command: string, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB.SEND_COMMAND, id, command, data),

    // 事件监听
    onCreated: (callback: (tab: Tab) => void) => {
      const handler = (_: any, tab: Tab) => callback(tab);
      ipcRenderer.on(IPC_CHANNELS.TAB.CREATED, handler);
      return () => ipcRenderer.off(IPC_CHANNELS.TAB.CREATED, handler);
    },
    onClosed: (callback: (id: string) => void) => {
      const handler = (_: any, id: string) => callback(id);
      ipcRenderer.on(IPC_CHANNELS.TAB.CLOSED, handler);
      return () => ipcRenderer.off(IPC_CHANNELS.TAB.CLOSED, handler);
    },
    onStatusChanged: (callback: (id: string, status: TabStatus) => void) => {
      const handler = (_: any, data: { id: string; status: TabStatus }) => 
        callback(data.id, data.status);
      ipcRenderer.on(IPC_CHANNELS.TAB.STATUS_CHANGED, handler);
      return () => ipcRenderer.off(IPC_CHANNELS.TAB.STATUS_CHANGED, handler);
    },
  },

  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.IS_MAXIMIZED),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
```

---

## 3. 渲染进程 (Admin UI - Vben Admin)

### 3.1 使用 Vben Admin 核心包

```typescript
// src/renderer/src/main.ts
import { createApp } from 'vue';
import { setupVbenApp } from '@vben/core';
import App from './App.vue';
import { router } from './router';
import { store } from './store';
import { setupElectronBridge } from './api/electron';

async function bootstrap() {
  const app = createApp(App);

  // 使用 Vben Admin 的配置
  await setupVbenApp(app, {
    router,
    store,
  });

  // 设置 Electron 桥接
  setupElectronBridge();

  app.mount('#app');
}

bootstrap();
```

```typescript
// src/renderer/src/store/modules/tabs.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<string | null>(null);

  const activeTab = computed(() => 
    tabs.value.find(t => t.id === activeTabId.value)
  );

  async function fetchTabs() {
    tabs.value = await window.electronAPI.tabs.getAll();
  }

  async function createTab(config: TabConfig) {
    const tab = await window.electronAPI.tabs.create(config);
    tabs.value.push(tab);
    activeTabId.value = tab.id;
  }

  async function closeTab(id: string) {
    await window.electronAPI.tabs.close(id);
    tabs.value = tabs.value.filter(t => t.id !== id);
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[0]?.id ?? null;
    }
  }

  function switchTab(id: string) {
    window.electronAPI.tabs.switch(id);
    activeTabId.value = id;
  }

  // 监听事件
  function setupListeners() {
    window.electronAPI.tabs.onCreated((tab) => {
      if (!tabs.value.find(t => t.id === tab.id)) {
        tabs.value.push(tab);
      }
    });

    window.electronAPI.tabs.onClosed((id) => {
      tabs.value = tabs.value.filter(t => t.id !== id);
    });

    window.electronAPI.tabs.onStatusChanged((id, status) => {
      const tab = tabs.value.find(t => t.id === id);
      if (tab) tab.status = status;
    });
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    fetchTabs,
    createTab,
    closeTab,
    switchTab,
    setupListeners,
  };
});
```

---

## 4. 依赖清单

```json
{
  "dependencies": {
    "@vben/core": "workspace:*",
    "@vben/layouts": "workspace:*",
    "@vben/common-ui": "workspace:*",
    "@vben/preferences": "workspace:*",
    "@vben/stores": "workspace:*",
    "@vben/hooks": "workspace:*",
    "@vben/utils": "workspace:*",
    "vue": "^3.5.27",
    "vue-router": "^4.5.1",
    "pinia": "^3.0.2",
    "ant-design-vue": "^4.2.6",
    "axios": "^1.9.0"
  },
  "devDependencies": {
    "electron": "^39.2.7",
    "electron-vite": "^5.0.0",
    "electron-builder": "^26.0.12",
    "@vitejs/plugin-vue": "^5.2.3",
    "typescript": "^5.8.3",
    "vite": "^7.3.0"
  }
}
```

> [!NOTE]
> `workspace:*` 表示使用 pnpm workspace 链接到 vue-vben-admin-main 的包。
> 需要将项目放在 vue-vben-admin-main monorepo 内，或者从 npm 安装发布版。
```

---

## 5. 相关文档

- [001. 核心需求](./antigravity-v2-001-requirements.md)
- [002. 架构设计](./antigravity-v2-002-architecture.md)
