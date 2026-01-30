# WPP Manager 重构实施计划

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | 3.2 (基于 vue-vben-admin) |
| 日期 | 2026-01-30 |
| 总时间 | 5 周（24 工作日）|

---

## Phase 1: 项目整合（2 天）

### 1.1 整合 vue-vben-admin

**目标：** 将 vue-vben-admin-main 作为项目基础

**步骤：**

```bash
# 1. 在 desktop 目录下整合 vue-vben-admin
cd /Users/lxl/Documents/ljr/project/wpp
mkdir -p desktop
cp -r vue-vben-admin-main/* desktop/
cp -r vue-vben-admin-main/.* desktop/

# 2. 创建 Electron 目录结构
mkdir -p desktop/electron/{main/{app,core,window,whatsapp,controllers,ipc},preload/{admin,whatsapp},shared/{types,constants,utils}}

# 3. 复制 WA-JS 文件
mkdir -p desktop/resources/wa-js
cp -r ../desktop_old/resources/wa-js/* desktop/resources/wa-js/

# 4. 安装依赖
cd desktop && pnpm install
```

### 1.2 配置 pnpm workspace

**文件：** `desktop/pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'electron'  # 新增
```

### 1.3 配置 package.json

**文件：** `desktop/package.json`

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
    "build:app:mac": "pnpm build:app --mac",
    "build:app:linux": "pnpm build:app --linux"
  },
  "devDependencies": {
    // Vben 原有依赖
    "@vben/vite-config": "workspace:*",
    "turbo": "catalog:",
    "vite": "catalog:",

    // Electron 新增依赖
    "electron": "^39.0.0",
    "electron-builder": "^25.0.0",
    "tsx": "^4.0.0"
  }
}
```

### 1.4 验收标准

- [ ] `pnpm install` 成功
- [ ] `pnpm dev` 能启动 vben 应用
- [ ] Electron 目录结构创建完成

---

## Phase 2: 核心层（2 天）

### 2.1 依赖注入容器

**文件：** `desktop/electron/main/core/di/service-container.ts`

```typescript
export type ServiceFactory<T> = () => T;

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

### 2.2 日志系统

**文件：** `desktop/electron/main/core/logger/logger.ts`

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: Error): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error);
    }
  }
}
```

### 2.3 共享类型定义

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
  id: string;
  title: string;
  status: TabStatus;
  closable: true;
  partition: string;
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

**文件：** `desktop/electron/shared/types/ipc.ts`

```typescript
export interface IPCInvokeMap {
  'tab:create': (data: { name: string; proxy?: ProxyConfig }) => Promise<Tab>;
  'tab:close': (tabId: string) => Promise<void>;
  'tab:switch': (tabId: string) => void;
  'tab:reorder': (tabIds: string[]) => void;
  'tab:getStatus': (tabId: string) => Promise<TabStatus>;
  'tab:setProxy': (tabId: string, proxy: ProxyConfig) => Promise<void>;
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

### 2.4 验收标准

- [ ] ServiceContainer 测试通过
- [ ] Logger 功能正常
- [ ] 类型定义无错误

---

## Phase 3: 主进程核心（4 天）

### 3.1 MainWindow

**文件：** `desktop/electron/main/window/main-window.ts`

```typescript
import { BrowserWindow, app } from 'electron';
import { join } from 'path';

export class MainWindow {
  private window: BrowserWindow | null = null;

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      frame: false,  // 无边框，使用自定义 TabBar
      show: false,
      webPreferences: {
        preload: join(__dirname, '../../preload/admin/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 窗口准备好后显示
    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    // 开发模式下打开 DevTools
    if (process.env.NODE_ENV === 'development') {
      this.window.webContents.openDevTools();
    }

    return this.window;
  }

  get(): BrowserWindow | null {
    return this.window;
  }
}
```

### 3.2 ViewManager

**文件：** `desktop/electron/main/window/view-manager.ts`

```typescript
import { BrowserWindow, WebContentsView } from 'electron';
import { join } from 'path';
import type { WhatsAppAccount } from 'electron/shared/types';
import { ProxyManager } from '../whatsapp/proxy-manager';

export class ViewManager {
  private views = new Map<string, WebContentsView>();
  private activeViewId: string | null = null;

  constructor(
    private mainWindow: BrowserWindow,
    private proxyManager: ProxyManager,
  ) {}

  createAdminView(): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../preload/admin/index.js'),
      },
    });

    const url = process.env.VITE_DEV_SERVER_URL || 'app://./index.html';
    view.webContents.loadURL(url);

    this.addView('admin', view, { x: 0, y: 40, width: 1400, height: 860 });
    return view;
  }

  createWhatsAppView(account: WhatsAppAccount): WebContentsView {
    // ... (见架构设计文档)
  }

  switchView(viewId: string): void {
    // ... (见架构设计文档)
  }

  // ... 其他方法
}
```

### 3.3 SessionManager

**文件：** `desktop/electron/main/whatsapp/session-manager.ts`

```typescript
import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from 'fs';
import type { WhatsAppAccount } from 'electron/shared/types';

export class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = join(app.getPath('userData'), 'sessions');
    // 确保目录存在
    mkdirSync(this.sessionsDir, { recursive: true });
  }

  async save(account: WhatsAppAccount): Promise<void> {
    const filePath = join(this.sessionsDir, `${account.id}.json`);
    writeFileSync(filePath, JSON.stringify(account, null, 2));
  }

  async load(accountId: string): Promise<WhatsAppAccount | null> {
    try {
      const filePath = join(this.sessionsDir, `${accountId}.json`);
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as WhatsAppAccount;
    } catch {
      return null;
    }
  }

  async loadAll(): Promise<WhatsAppAccount[]> {
    const accounts: WhatsAppAccount[] = [];
    try {
      const files = readdirSync(this.sessionsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = readFileSync(join(this.sessionsDir, file), 'utf-8');
          accounts.push(JSON.parse(content));
        }
      }
    } catch {
      // 目录不存在或为空，返回空数组
    }
    return accounts;
  }

  async remove(accountId: string): Promise<void> {
    const filePath = join(this.sessionsDir, `${accountId}.json`);
    try {
      unlinkSync(filePath);
    } catch {
      // 文件不存在，忽略
    }
  }
}
```

### 3.4 AccountManager

**文件：** `desktop/electron/main/whatsapp/account-manager.ts`

```typescript
import { EventEmitter } from 'events';
import type { WhatsAppAccount, AccountStatus } from 'electron/shared/types';
import { SessionManager } from './session-manager';
import { ViewManager } from '../window/view-manager';

export class AccountManager extends EventEmitter {
  private accounts = new Map<string, WhatsAppAccount>();

  constructor(
    private sessionManager: SessionManager,
    private viewManager: ViewManager,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    const saved = await this.sessionManager.loadAll();
    saved.forEach((account) => {
      account.status = 'stopped';
      this.accounts.set(account.id, account);
    });
  }

  async create(name: string): Promise<string> {
    const id = `account_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const account: WhatsAppAccount = {
      id,
      name,
      status: 'stopped',
      partition: `persist:wa-${id}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.accounts.set(id, account);
    await this.sessionManager.save(account);

    this.emit('account:created', account);
    return id;
  }

  async start(accountId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    account.status = 'starting';
    await this.sessionManager.save(account);
    this.emit('account:status', accountId, 'starting');

    // 创建视图
    await this.viewManager.createWhatsAppView(account);
  }

  async stop(accountId: string): Promise<void> {
    this.viewManager.removeView(accountId);

    const account = this.accounts.get(accountId);
    if (account) {
      account.status = 'stopped';
      this.emit('account:status', accountId, 'stopped');
    }
  }

  async delete(accountId: string): Promise<void> {
    await this.stop(accountId);
    this.accounts.delete(accountId);
    await this.sessionManager.remove(accountId);
    this.emit('account:deleted', accountId);
  }

  getAll(): WhatsAppAccount[] {
    return Array.from(this.accounts.values());
  }

  get(accountId: string): WhatsAppAccount | undefined {
    return this.accounts.get(accountId);
  }
}
```

### 3.5 ProxyManager

**文件：** `desktop/electron/main/whatsapp/proxy-manager.ts`

```typescript
import { session } from 'electron';

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

  applyProxy(ses: Session, tabId: string): void {
    const config = this.getProxy(tabId);
    if (!config) {
      ses.setProxy({ mode: 'direct' });
      return;
    }

    if (config.type === 'pac') {
      ses.setProxy({
        mode: 'pac_script',
        pacScript: config.pacScript!,
      });
    } else {
      ses.setProxy({
        mode: 'fixed_servers',
        proxyRules: `${config.type}://${config.host}:${config.port}`,
      });
    }
  }
}
```

### 3.6 验收标准

- [ ] MainWindow 能创建主窗口
- [ ] ViewManager 能创建和切换视图
- [ ] SessionManager 能保存和加载账号
- [ ] AccountManager CRUD 功能正常
- [ ] ProxyManager 能应用代理

---

## Phase 4: WhatsApp 集成（4 天）

### 4.1 WhatsApp Preload

**文件：** `desktop/electron/preload/whatsapp/index.ts`

```typescript
import { ipcRenderer, webFrame } from 'electron';

const accountId = new URLSearchParams(window.location.search).get('accountId');

if (!accountId) {
  throw new Error('accountId is required');
}

(async () => {
  try {
    // 隐藏 Electron 特征
    (window as any).process = undefined;
    delete (window as any).require;

    // 注入 WA-JS
    const waJsPath = await ipcRenderer.invoke('wa-js:get-content');
    webFrame.executeJavaScript(waJsPath);

    // 等待 WPP 就绪
    await new Promise<void>((resolve) => {
      const check = () => {
        if ((window as any).WPP) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    // 设置事件监听
    const WPP = (window as any).WPP;
    WPP.on('conn.authenticated', (userData: any) => {
      ipcRenderer.send(`wa:login:${accountId}`, userData);
    });

    WPP.on('conn.disconnected', () => {
      ipcRenderer.send(`wa:logout:${accountId}`);
    });

    // 通知就绪
    ipcRenderer.send(`wa:ready:${accountId}`);
  } catch (error) {
    console.error('WhatsApp preload error:', error);
    ipcRenderer.send(`wa:error:${accountId}`, error);
  }
})();
```

### 4.2 验收标准

- [ ] WA-JS 成功注入
- [ ] 事件监听正常
- [ ] 能发送消息

---

## Phase 5: 控制器层（2 天）

### 5.1 WhatsAppController

**文件：** `desktop/electron/main/controllers/whatsapp-controller.ts`

```typescript
import { z } from 'zod';
import { AccountManager } from '../whatsapp/account-manager';

export class WhatsAppController {
  constructor(private accountManager: AccountManager) {}

  async getAccounts(): Promise<WhatsAppAccount[]> {
    return this.accountManager.getAll();
  }

  async createAccount(data: { name: string }): Promise<string> {
    const schema = z.object({
      name: z.string().min(1).max(50),
    });
    const { name } = schema.parse(data);
    return this.accountManager.create(name);
  }

  async startAccount(accountId: string): Promise<void> {
    return this.accountManager.start(accountId);
  }

  async stopAccount(accountId: string): Promise<void> {
    return this.accountManager.stop(accountId);
  }

  async deleteAccount(accountId: string): Promise<void> {
    return this.accountManager.delete(accountId);
  }
}
```

### 5.2 TabController

**文件：** `desktop/electron/main/controllers/tab-controller.ts`

```typescript
import { ViewManager } from '../window/view-manager';
import { AccountManager } from '../whatsapp/account-manager';
import { ProxyManager } from '../whatsapp/proxy-manager';
import type { WhatsAppTab, Tab } from 'electron/shared/types/tabs';

export class TabController {
  constructor(
    private viewManager: ViewManager,
    private accountManager: AccountManager,
    private proxyManager: ProxyManager,
  ) {}

  async createWhatsAppTab(data: {
    name: string;
    proxy?: ProxyConfig;
  }): Promise<Tab> {
    const accountId = await this.accountManager.create(data.name);

    if (data.proxy) {
      this.proxyManager.setProxy(accountId, data.proxy);
    }

    await this.viewManager.createWhatsAppView({
      id: accountId,
      type: 'whatsapp',
      title: data.name,
      status: 'stopped',
      partition: `persist:wa-${accountId}`,
      closable: true,
    });

    return {
      id: accountId,
      type: 'whatsapp',
      title: data.name,
      status: 'stopped',
      closable: true,
    };
  }

  async closeTab(tabId: string): Promise<void> {
    await this.accountManager.stop(tabId);
    await this.accountManager.delete(tabId);
    this.viewManager.removeView(tabId);
  }

  switchTab(tabId: string): void {
    this.viewManager.switchView(tabId);
  }

  reorderTabs(tabIds: string[]): void {
    // 保存顺序到配置
  }
}
```

### 5.3 IPC 注册

**文件：** `desktop/electron/main/ipc/register.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import type { ServiceContainer } from '../core/di/service-container';

export function registerIPCHandlers(
  window: BrowserWindow,
  container: ServiceContainer,
): void {
  const whatsappController = container.resolve('whatsappController');
  const tabController = container.resolve('tabController');

  // WhatsApp 账号相关
  ipcMain.handle('whatsapp:getAccounts', () => whatsappController.getAccounts());
  ipcMain.handle('whatsapp:createAccount', (_, data) => whatsappController.createAccount(data));
  ipcMain.handle('whatsapp:startAccount', (_, accountId) => whatsappController.startAccount(accountId));
  ipcMain.handle('whatsapp:stopAccount', (_, accountId) => whatsappController.stopAccount(accountId));
  ipcMain.handle('whatsapp:deleteAccount', (_, accountId) => whatsappController.deleteAccount(accountId));

  // 标签页相关
  ipcMain.on('tab:switch', (_, tabId) => tabController.switchTab(tabId));
  ipcMain.on('tab:close', (_, tabId) => tabController.closeTab(tabId));

  // 窗口操作
  ipcMain.on('window:minimize', () => window.minimize());
  ipcMain.on('window:maximize', () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });
  ipcMain.on('window:close', () => window.close());
}
```

### 5.4 验收标准

- [ ] Controller 测试通过
- [ ] IPC 调用正常
- [ ] 参数验证生效

---

## Phase 6: 渲染进程（3 天）

### 6.1 修改 bootstrap.ts

**文件：** `desktop/apps/web-antd/src/bootstrap.ts`

```typescript
import { createApp } from 'vue';

// Vben 原有引导代码
// ...

// 新增：初始化 WPP Store
export async function initApplication() {
  // Vben 原有初始化
  // ...

  // 新增：设置 WPP 事件监听
  const { useWppStore } = await import('#/store/modules/wpp');
  const wppStore = useWppStore();
  wppStore.setupListeners();
}
```

### 6.2 WppStore

**文件：** `desktop/apps/web-antd/src/store/modules/wpp.ts`

```typescript
import { defineStore } from '@vben/stores';
import { ref } from 'vue';
import type { Tab } from 'electron/shared/types/tabs';

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
    setupListeners,
  };
});
```

### 6.3 WPP 布局

**文件：** `desktop/apps/web-antd/src/layouts/wpp/index.vue`

```vue
<template>
  <div class="wpp-layout">
    <TabBar />
    <div class="wpp-content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import TabBar from './components/tab-bar.vue';
</script>

<style scoped>
.wpp-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.wpp-content {
  flex: 1;
  overflow: auto;
}
</style>
```

### 6.4 验收标准

- [ ] 页面正常显示
- [ ] TabBar 显示正常
- [ ] 状态管理正常

---

## Phase 7: TabBar 组件（2 天）

### 7.1 TabBar 组件

**文件：** `desktop/apps/web-antd/src/layouts/wpp/components/tab-bar.vue`

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
import { ref } from 'vue';
import { useWppStore } from '#/store/modules/wpp';
import {
  WhatsAppOutlined,
  DashboardOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseSquareOutlined,
} from '@ant-design/icons-vue';

const wppStore = useWppStore();
const { tabs, activeTabId } = storeToRefs(wppStore);

const isMaximized = ref(false);

// 拖动排序逻辑
// ...

function switchTab(tabId: string) {
  wppStore.switchTab(tabId);
}

function closeTab(tabId: string) {
  wppStore.closeTab(tabId);
}

function createNewTab() {
  wppStore.createNewWhatsAppTab();
}

function minimize() {
  window.electronAPI.window.minimize();
}

function maximize() {
  window.electronAPI.window.maximize();
  isMaximized.value = !isMaximized.value;
}

function close() {
  window.electronAPI.window.close();
}
</script>

<style scoped>
.wpp-tab-bar {
  height: 40px;
  background: #001529;
  display: flex;
  align-items: center;
}

.tabs-container {
  flex: 1;
  display: flex;
  overflow: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 40px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.tab-item.active {
  color: #fff;
  background: #1890ff;
}

.tab-title {
  margin: 0 8px;
}

.window-controls {
  display: flex;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
}

.control-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.control-btn.close:hover {
  background: #ff4d4f;
}
</style>
```

### 7.2 验收标准

- [ ] TabBar 正常显示
- [ ] 点击切换 tab 正常
- [ ] 拖动排序正常
- [ ] 窗口控制正常

---

## Phase 8: 测试（3 天）

### 8.1 单元测试

**示例：** `desktop/tests/unit/account-manager.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountManager } from 'electron/main/whatsapp/account-manager';

describe('AccountManager', () => {
  let manager: AccountManager;

  beforeEach(() => {
    manager = new AccountManager(sessionManager, viewManager);
  });

  it('should create account', async () => {
    const id = await manager.create('Test Account');
    expect(id).toBeTruthy();
  });

  it('should get all accounts', () => {
    const accounts = manager.getAll();
    expect(Array.isArray(accounts)).toBe(true);
  });
});
```

### 8.2 E2E 测试

**示例：** `desktop/tests/e2e/accounts.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('create account', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('button:has-text("创建账号")');
  await page.fill('input[placeholder*="账号名称"]', 'Test Account');
  await page.click('button:has-text("确定")');
  await expect(page.locator('text=创建成功')).toBeVisible();
});
```

### 8.3 验收标准

- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试全部通过
- [ ] 无已知 bug

---

## Phase 9: 打包部署（2 天）

### 9.1 electron-builder 配置

**文件：** `desktop/electron-builder.json`

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

### 9.2 构建脚本

**文件：** `desktop/scripts/electron/build.ts`

```typescript
import { execSync } from 'child_process';
import { join } from 'path';

console.log('Building WPP Manager...');

// 1. 构建 vben 应用
console.log('Building Vben app...');
execSync('pnpm build --filter=@vben/web-antd', { stdio: 'inherit' });

// 2. 构建 Electron 主进程
console.log('Building Electron main...');
execSync('pnpm electron-vite build', { stdio: 'inherit' });

// 3. 使用 electron-builder 打包
console.log('Packaging app...');
execSync('electron-builder', { stdio: 'inherit' });

console.log('Build complete!');
```

### 9.3 验收标准

- [ ] Windows 打包成功
- [ ] macOS 打包成功
- [ ] Linux 打包成功
- [ ] 安装后能正常运行

---

## 总结

| 阶段 | 内容 | 时间 |
|------|------|------|
| Phase 1 | 项目整合 | 2 天 |
| Phase 2 | 核心层 | 2 天 |
| Phase 3 | 主进程核心 | 4 天 |
| Phase 4 | WhatsApp 集成 | 4 天 |
| Phase 5 | 控制器层 | 2 天 |
| Phase 6 | 渲染进程 | 3 天 |
| Phase 7 | TabBar 组件 | 2 天 |
| Phase 8 | 测试 | 3 天 |
| Phase 9 | 打包部署 | 2 天 |
| **总计** | | **24 天 ≈ 5 周** |

---

## 相关文档

- [001. 架构设计](./claude-glm-reborn-001-architecture.md)
- [003. API 设计](./claude-glm-reborn-003-api.md)
- [核心需求](./claude-glm-reborn-core-requirements.md)
