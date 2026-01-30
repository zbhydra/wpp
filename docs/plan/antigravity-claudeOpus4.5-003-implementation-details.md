# 核心模块实现细节

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 1.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity Claude Opus 4.5 |
| 目的 | desktop 核心模块的详细实现规格 |

---

## 1. 主进程核心模块

### 1.1 MainWindow

**文件**: `src/main/window/MainWindow.ts`

**职责**: 创建和管理主窗口

```typescript
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

export class MainWindow {
  private window: BrowserWindow | null = null;

  constructor(private config: MainWindowConfig = DEFAULT_CONFIG) {}

  create(): BrowserWindow {
    this.window = new BrowserWindow({
      width: this.config.width,
      height: this.config.height,
      minWidth: this.config.minWidth,
      minHeight: this.config.minHeight,
      frame: false,              // 无边框窗口
      transparent: false,
      show: false,               // 等待 ready-to-show
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });

    // 单实例锁
    if (!app.requestSingleInstanceLock()) {
      app.quit();
    }

    // 窗口就绪后显示
    this.window.once('ready-to-show', () => {
      this.window?.maximize();
      this.window?.show();
    });

    return this.window;
  }

  getWindow(): BrowserWindow | null {
    return this.window;
  }

  close(): void {
    this.window?.close();
    this.window = null;
  }

  minimize(): void {
    this.window?.minimize();
  }

  maximize(): void {
    if (this.window?.isMaximized()) {
      this.window.restore();
    } else {
      this.window?.maximize();
    }
  }

  isMaximized(): boolean {
    return this.window?.isMaximized() ?? false;
  }
}
```

---

### 1.2 BrowserViewManager

**文件**: `src/main/window/BrowserViewManager.ts`

**职责**: 管理所有 WebContentsView (TabBar + Admin + WhatsApp Views)

**核心数据结构**:

```typescript
export type ViewType = 'tabbar' | 'admin' | 'whatsapp';

export interface ViewMetadata {
  type: ViewType;
  accountId?: string;    // 仅 whatsapp 类型
}

export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**关键方法**:

```typescript
export class BrowserViewManager {
  private views: Map<string, WebContentsView> = new Map();
  private metadata: Map<string, ViewMetadata> = new Map();
  private activeViewId: string | null = null;
  private tabBarHeight: number = 40;

  constructor(private mainWindow: BrowserWindow) {}

  // === 视图创建 ===

  /**
   * 创建 TabBar 视图 (内联 HTML)
   */
  createTabBarView(): void;

  /**
   * 创建 Admin 视图 (加载 Vben Admin)
   */
  createAdminView(): string;

  /**
   * 添加外部创建的 WhatsApp View
   */
  addWhatsAppView(accountId: string, view: WebContentsView): void;

  // === 视图切换 ===

  /**
   * 设置活跃视图
   */
  setActiveView(viewId: string): void;

  /**
   * 获取活跃视图 ID
   */
  getActiveViewId(): string | null;

  // === 视图管理 ===

  /**
   * 关闭视图
   */
  closeView(viewId: string): Promise<void>;

  /**
   * 获取视图
   */
  getView(viewId: string): WebContentsView | null;

  /**
   * 检查视图是否存在
   */
  hasView(viewId: string): boolean;

  // === 布局管理 ===

  /**
   * 更新视图边界
   */
  private updateViewBounds(view: WebContentsView): void;

  /**
   * 设置窗口大小调整处理器
   */
  private setupWindowResizeHandler(): void;

  // === 清理 ===

  /**
   * 清理所有视图
   */
  cleanup(): Promise<void>;
}
```

**TabBar HTML 模板** (Ant Design 风格):

```typescript
private getTabBarHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
      background: #001529;
      height: 40px;
      display: flex;
      -webkit-app-region: drag;
    }
    .tabs-container {
      display: flex;
      flex: 1;
      overflow-x: auto;
      -webkit-app-region: no-drag;
    }
    .tab {
      display: flex;
      align-items: center;
      padding: 0 16px;
      height: 40px;
      background: transparent;
      color: rgba(255, 255, 255, 0.65);
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    .tab:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }
    .tab.active {
      color: #1890ff;
      border-bottom-color: #1890ff;
    }
    .tab-close {
      margin-left: 8px;
      opacity: 0.6;
    }
    .tab-close:hover {
      opacity: 1;
    }
    .window-controls {
      display: flex;
      -webkit-app-region: no-drag;
    }
    .window-btn {
      width: 46px;
      height: 40px;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.65);
      cursor: pointer;
      transition: background 0.2s;
    }
    .window-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .window-btn.close:hover {
      background: #e81123;
      color: white;
    }
  </style>
</head>
<body>
  <div class="tabs-container" id="tabs"></div>
  <div class="window-controls">
    <button class="window-btn" id="minimize">─</button>
    <button class="window-btn" id="maximize">□</button>
    <button class="window-btn close" id="close">✕</button>
  </div>
</body>
</html>
  `;
}
```

---

### 1.3 WhatsAppAccountManager

**文件**: `src/main/whatsapp/WhatsAppAccountManager.ts`

**职责**: 账号 CRUD 和生命周期管理

**核心接口**:

```typescript
export interface AccountCallbacks {
  onReady: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onUserInfo: (accountId: string, userInfo: UserInfo) => void;
  onMessageReceived: (accountId: string, message: Message) => void;
  onMessageSent: (accountId: string, message: Message) => void;
  onError: (accountId: string, error: string) => void;
  onClosed: () => void;
}
```

**关键流程 - 启动账号**:

```typescript
async startAccount(accountId: string): Promise<void> {
  // 1. 检查是否已运行
  if (this.viewManager.hasView(accountId)) {
    this.eventService.notifyTabSwitched(accountId);
    throw new Error('Account already running');
  }

  // 2. 更新状态为启动中
  this.updateAccountStatus(accountId, AccountStatus.Starting);

  // 3. 注册回调
  this.viewManager.registerCallbacks(accountId, {
    onReady: () => console.log(`Account ${accountId} WA-JS ready`),
    onLogin: () => this.updateAccountStatus(accountId, AccountStatus.Ready),
    onLogout: () => this.updateAccountStatus(accountId, AccountStatus.QR),
    // ... 其他回调
  });

  try {
    // 4. 创建视图
    const waView = this.viewManager.createView(accountId);

    // 5. 添加到 BrowserViewManager
    this.browserViewManager.addWhatsAppView(accountId, waView.getBrowserView());

    // 6. 加载 WhatsApp Web
    await waView.load();

    // 7. 通知 Renderer 创建标签页
    this.eventService.notifyTabCreated(accountId, this.getAccountName(accountId));
    this.eventService.notifyTabSwitched(accountId);

    // 8. 更新状态为 QR
    this.updateAccountStatus(accountId, AccountStatus.QR);
  } catch (error) {
    // 清理资源
    await this.viewManager.closeView(accountId);
    await this.browserViewManager.closeView(accountId);
    throw error;
  }
}
```

---

### 1.4 WhatsAppBrowserView

**文件**: `src/main/whatsapp/WhatsAppBrowserView.ts`

**职责**: 单个 WhatsApp 视图封装

**关键配置**:

```typescript
export class WhatsAppBrowserView {
  private view: WebContentsView;
  private partition: string;
  
  constructor(private accountId: string) {
    this.partition = `persist:wa-${accountId}`;
    
    const session = electronSession.fromPartition(this.partition);
    
    this.view = new WebContentsView({
      webPreferences: {
        preload: getWhatsAppPreloadPath(),
        partition: this.partition,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        session,
      },
    });

    // 修改 CSP 头部以允许 WA-JS 注入
    this.setupCSPModification();
  }

  private setupCSPModification(): void {
    const session = electronSession.fromPartition(this.partition);
    
    session.webRequest.onHeadersReceived(
      { urls: ['https://web.whatsapp.com/*'] },
      (details, callback) => {
        const headers = { ...details.responseHeaders };
        
        // 修改或移除 CSP
        const cspHeaders = ['content-security-policy', 'Content-Security-Policy'];
        for (const header of cspHeaders) {
          if (headers[header]) {
            // 允许 eval 和内联脚本
            headers[header] = headers[header].map(csp =>
              csp.replace(/script-src [^;]+/g, "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
            );
          }
        }
        
        callback({ responseHeaders: headers });
      }
    );
  }

  async load(): Promise<void> {
    this.view.webContents.loadURL('https://web.whatsapp.com');
    
    return new Promise((resolve, reject) => {
      this.view.webContents.once('did-finish-load', () => resolve());
      this.view.webContents.once('did-fail-load', (_, code, desc) => 
        reject(new Error(`Load failed: ${code} - ${desc}`))
      );
    });
  }

  getBrowserView(): WebContentsView {
    return this.view;
  }

  destroy(): void {
    this.view.webContents.close();
  }
}
```

---

### 1.5 EventService

**文件**: `src/main/services/EventService.ts`

**职责**: 中央事件总线，跨进程消息转发

```typescript
export class EventService {
  private mainWindow: BrowserWindow | null = null;
  private viewManager: WhatsAppViewManager | null = null;
  private browserViewManager: BrowserViewManager | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setViewManager(manager: WhatsAppViewManager): void {
    this.viewManager = manager;
  }

  setBrowserViewManager(manager: BrowserViewManager): void {
    this.browserViewManager = manager;
  }

  /**
   * WhatsApp View → Main → Renderer
   */
  forwardWhatsAppEventToRenderer(channel: string, payload: any): void {
    // 获取 Admin View
    const adminView = this.browserViewManager?.getView('admin');
    if (adminView) {
      adminView.webContents.send(channel, payload);
    }
  }

  /**
   * Renderer → Main → WhatsApp View
   */
  async forwardToWhatsAppView(
    accountId: string,
    command: string,
    data: any
  ): Promise<any> {
    const view = this.viewManager?.getView(accountId);
    if (!view) {
      throw new Error(`View not found for account: ${accountId}`);
    }
    
    return view.sendCommand(command, data);
  }

  /**
   * 广播到 Renderer (Admin View)
   */
  broadcastToRenderer(channel: string, data: any): void {
    const adminView = this.browserViewManager?.getView('admin');
    if (adminView) {
      adminView.webContents.send(channel, data);
    }
  }

  // 标签事件
  notifyTabCreated(accountId: string, name: string): void {
    const tabBarView = this.browserViewManager?.getView('tabbar');
    if (tabBarView) {
      tabBarView.webContents.send('tab:created', { id: accountId, name });
    }
  }

  notifyTabClosed(accountId: string): void {
    const tabBarView = this.browserViewManager?.getView('tabbar');
    if (tabBarView) {
      tabBarView.webContents.send('tab:closed', accountId);
    }
  }

  notifyTabSwitched(accountId: string): void {
    const tabBarView = this.browserViewManager?.getView('tabbar');
    if (tabBarView) {
      tabBarView.webContents.send('tab:switched', accountId);
    }
  }
}

// 单例
let eventService: EventService | null = null;

export function getEventService(): EventService {
  if (!eventService) {
    eventService = new EventService();
  }
  return eventService;
}
```

---

## 2. Preload 层

### 2.1 Admin Preload

**文件**: `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// 类型定义
export interface ElectronAPI {
  whatsapp: {
    getAccounts: () => Promise<Account[]>;
    createAccount: (name: string) => Promise<string>;
    deleteAccount: (id: string) => Promise<void>;
    startAccount: (id: string) => Promise<void>;
    stopAccount: (id: string) => Promise<void>;
    renameAccount: (id: string, newName: string) => Promise<void>;
    sendMessage: (accountId: string, to: string, message: string) => Promise<void>;
    onAccountsUpdate: (callback: (accounts: Account[]) => void) => void;
    onMessageReceived: (callback: (data: { accountId: string; message: Message }) => void) => void;
  };
  tabs: {
    switch: (id: string) => void;
    close: (id: string) => void;
    onCreated: (callback: (tab: TabItem) => void) => () => void;
    onClosed: (callback: (tabId: string) => void) => () => void;
    onSwitched: (callback: (tabId: string) => void) => () => void;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
}

// 暴露 API
contextBridge.exposeInMainWorld('electronAPI', {
  whatsapp: {
    getAccounts: () => ipcRenderer.invoke('whatsapp:getAccounts'),
    createAccount: (name) => ipcRenderer.invoke('whatsapp:createAccount', name),
    deleteAccount: (id) => ipcRenderer.invoke('whatsapp:deleteAccount', id),
    startAccount: (id) => ipcRenderer.invoke('whatsapp:startAccount', id),
    stopAccount: (id) => ipcRenderer.invoke('whatsapp:stopAccount', id),
    renameAccount: (id, newName) => ipcRenderer.invoke('whatsapp:renameAccount', id, newName),
    sendMessage: (accountId, to, message) => 
      ipcRenderer.invoke('whatsapp:sendMessage', accountId, to, message),
    onAccountsUpdate: (callback) => {
      ipcRenderer.on('whatsapp:accounts:update', (_, accounts) => callback(accounts));
    },
    onMessageReceived: (callback) => {
      ipcRenderer.on('whatsapp:message:received', (_, data) => callback(data));
    },
  },
  tabs: {
    switch: (id) => ipcRenderer.send('tab:switch', id),
    close: (id) => ipcRenderer.send('tab:close', id),
    onCreated: (callback) => {
      const handler = (_, tab) => callback(tab);
      ipcRenderer.on('tab:created', handler);
      return () => ipcRenderer.off('tab:created', handler);
    },
    onClosed: (callback) => {
      const handler = (_, tabId) => callback(tabId);
      ipcRenderer.on('tab:closed', handler);
      return () => ipcRenderer.off('tab:closed', handler);
    },
    onSwitched: (callback) => {
      const handler = (_, tabId) => callback(tabId);
      ipcRenderer.on('tab:switched', handler);
      return () => ipcRenderer.off('tab:switched', handler);
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback) => {
      const handler = (_, isMaximized) => callback(isMaximized);
      ipcRenderer.on('maximize-changed', handler);
      return () => ipcRenderer.off('maximize-changed', handler);
    },
  },
} as ElectronAPI);

// 声明全局类型
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

### 2.2 WhatsApp Preload

**文件**: `src/preload/whatsapp/index.ts`

```typescript
import { ipcRenderer, webFrame } from 'electron';
import { hideElectronFingerprints } from './utils/anti-detection';
import { injectWaJs } from './injectors/wa-js-injector';
import { setupEventListeners } from './events/whatsapp-event-listener';
import { setupCommandHandler } from './commands/command-handler';

// 初始化
async function init() {
  const accountId = await getAccountIdFromUrl();
  
  // 1. 隐藏 Electron 特征
  hideElectronFingerprints();

  // 2. 等待 DOM 就绪
  await waitForDOMReady();

  // 3. 注入 WA-JS
  await injectWaJs();

  // 4. 等待 WPP 就绪
  await waitForWPP();

  // 5. 设置事件监听
  setupEventListeners(accountId);

  // 6. 设置命令处理
  setupCommandHandler(accountId);

  // 7. 通知主进程 READY
  ipcRenderer.send(`whatsapp_window:ready:${accountId}`);
}

// 工具函数
async function getAccountIdFromUrl(): Promise<string> {
  // 从 partition 或其他方式获取 accountId
  const partition = webFrame.resourcesUrl?.match(/persist:wa-(.+)/)?.[1];
  return partition || 'unknown';
}

function waitForDOMReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', () => resolve());
    }
  });
}

function waitForWPP(): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100;
    
    const check = () => {
      if (typeof WPP !== 'undefined' && WPP.isReady) {
        resolve();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(check, 100);
      } else {
        reject(new Error('WPP initialization timeout'));
      }
    };
    
    check();
  });
}

// 启动
init().catch(console.error);
```

---

## 3. 渲染进程核心

### 3.1 Electron API Hook

**文件**: `src/renderer/src/api/electron/index.ts`

```typescript
import type { ElectronAPI } from '@preload/index';

// 获取 Electron API
function getElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
  return window.electronAPI;
}

// Vue 组合式 API Hook
export function useElectron() {
  const api = getElectronAPI();
  return api;
}

// 导出类型
export type { ElectronAPI };
```

---

### 3.2 WhatsApp Store

**文件**: `src/renderer/src/store/modules/whatsapp.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useElectron } from '@/api/electron';

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  phoneNumber?: string;
  userInfo?: UserInfo;
}

export enum AccountStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  QR = 'qr',
  Ready = 'ready',
  LoggedIn = 'logged_in',
  LoggedOut = 'logged_out',
  Error = 'error',
}

export const useWhatsAppStore = defineStore('whatsapp', () => {
  const { whatsapp } = useElectron();

  // 状态
  const accounts = ref<Account[]>([]);
  const selectedAccountId = ref<string | null>(null);
  const loading = ref(false);

  // 计算属性
  const selectedAccount = computed(() => 
    accounts.value.find(a => a.id === selectedAccountId.value)
  );

  const runningAccounts = computed(() =>
    accounts.value.filter(a => a.status !== AccountStatus.Stopped)
  );

  // 方法
  async function fetchAccounts() {
    loading.value = true;
    try {
      accounts.value = await whatsapp.getAccounts();
    } finally {
      loading.value = false;
    }
  }

  async function createAccount(name: string) {
    const id = await whatsapp.createAccount(name);
    await fetchAccounts();
    return id;
  }

  async function startAccount(id: string) {
    await whatsapp.startAccount(id);
  }

  async function stopAccount(id: string) {
    await whatsapp.stopAccount(id);
  }

  async function deleteAccount(id: string) {
    await whatsapp.deleteAccount(id);
    await fetchAccounts();
  }

  // 监听账号更新
  function setupListeners() {
    whatsapp.onAccountsUpdate((updatedAccounts) => {
      accounts.value = updatedAccounts;
    });
  }

  return {
    accounts,
    selectedAccountId,
    selectedAccount,
    runningAccounts,
    loading,
    fetchAccounts,
    createAccount,
    startAccount,
    stopAccount,
    deleteAccount,
    setupListeners,
  };
});
```

---

## 4. IPC 通道定义

**文件**: `src/shared/ipc/channels.ts`

```typescript
// Renderer → Main (invoke)
export const RENDERER_INVOKE_CHANNELS = {
  // WhatsApp 账号
  'whatsapp:getAccounts': null,
  'whatsapp:createAccount': null,
  'whatsapp:deleteAccount': null,
  'whatsapp:startAccount': null,
  'whatsapp:stopAccount': null,
  'whatsapp:renameAccount': null,
  
  // 消息
  'whatsapp:sendMessage': null,
  'whatsapp:getChats': null,
  'whatsapp:getContacts': null,
  
  // 窗口
  'window:minimize': null,
  'window:maximize': null,
  'window:close': null,
  'window:isMaximized': null,
} as const;

// Main → Renderer (send)
export const RENDERER_EVENT_CHANNELS = {
  'whatsapp:accounts:update': null,
  'whatsapp:message:received': null,
  'whatsapp:message:sent': null,
  'tab:created': null,
  'tab:closed': null,
  'tab:switched': null,
  'maximize-changed': null,
} as const;

// WhatsApp View → Main (send)
export const WHATSAPP_VIEW_CHANNELS = {
  'whatsapp_window:ready': null,
  'whatsapp_window:login': null,
  'whatsapp_window:logout': null,
  'whatsapp_window:message_received': null,
  'whatsapp_window:message_sent': null,
  'whatsapp_window:user_info': null,
  'whatsapp_window:error': null,
} as const;

// Main → WhatsApp View (send)
export const WHATSAPP_COMMAND_CHANNELS = {
  'whatsapp_window:command': null,
} as const;

// Tab 相关
export const TAB_CHANNELS = {
  'tab:switch': null,
  'tab:close': null,
  'tab:reorder': null,
} as const;
```

---

## 5. 类型定义

**文件**: `src/shared/types/index.ts`

```typescript
// === 账号相关 ===

export enum AccountStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  QR = 'qr',
  Ready = 'ready',
  LoggedIn = 'logged_in',
  LoggedOut = 'logged_out',
  Error = 'error',
}

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  phoneNumber?: string;
  userInfo?: UserInfo;
  error?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface UserInfo {
  user: string;
  name?: string;
  pushname?: string;
  platform?: string;
}

// === 消息相关 ===

export interface Message {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: MessageType;
  isFromMe: boolean;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';

// === 聊天相关 ===

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: Message;
  unreadCount: number;
  timestamp: number;
}

// === 联系人相关 ===

export interface Contact {
  id: string;
  name: string;
  phone: string;
  pushname?: string;
  isMyContact: boolean;
}

// === 标签相关 ===

export interface TabItem {
  id: string;
  type: 'admin' | 'whatsapp';
  title: string;
  icon?: string;
  status?: AccountStatus;
  closable: boolean;
}

// === IPC 相关 ===

export interface IPCResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 6. 相关文档

- [001. 分支对比分析](./antigravity-claudeOpus4.5-001-vben-comparison.md)
- [002. 迁移策略](./antigravity-claudeOpus4.5-002-migration-strategy.md)
- [004. 架构设计](./antigravity-claudeOpus4.5-004-architecture.md)
