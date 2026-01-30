import { WebContentsView, ipcMain, IpcMainEvent } from 'electron';
import { UserInfo } from '../types';
import { ViewCallbacks } from '../base/BaseViewManager';
import { getWhatsAppPreloadPath } from '../utils/paths';
import { WHATSAPP_WINDOW_CHANNELS } from '../../shared/ipc/channels';

/**
 * WhatsApp WebContentsView 事件回调接口（继承自基类接口）
 */
export interface WhatsAppViewCallbacks extends ViewCallbacks {
  onReady: () => void;
  onLogin: () => void;
  onUserInfo: (viewId: string, userInfo: UserInfo) => void;
  onLogout: () => void;
  onMessageReceived: (viewId: string, message: any) => void;
  onMessageSent: (viewId: string, message: any) => void;
  onError: (viewId: string, error: string) => void;
  onClosed: () => void;
}

/**
 * WhatsApp WebContentsView 封装
 * 负责单个 WhatsApp Web WebContentsView 的创建、加载和事件处理
 */
export class WhatsAppBrowserView {
  private view: WebContentsView | null = null;
  private accountId: string;
  private callbacks: WhatsAppViewCallbacks;
  private waJSReady: boolean = false;
  private messenger: WhatsAppViewMessenger | null = null;

  constructor(accountId: string, callbacks: WhatsAppViewCallbacks) {
    this.accountId = accountId;
    this.callbacks = callbacks;
    this.createView();
    this.setupIPCHandlers();
  }

  /**
   * 创建视图
   */
  private createView(): void {
    this.view = new WebContentsView({
      webPreferences: {
        partition: `persist:wa-${this.accountId}`,
        preload: getWhatsAppPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        webSecurity: true,
        javascript: true,
        additionalArguments: [`--accountid=${this.accountId}`],
      },
    });
    this.view.setBackgroundColor('#00000000'); // 透明背景

    // 确保这个视图的 session 也使用正确的 User-Agent
    const session = this.view.webContents.session;
    const chromeUserAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    session.setUserAgent(chromeUserAgent);

    // 修改 CSP 头以允许加载 wapp-assets 协议的脚本
    session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      const csp = responseHeaders['Content-Security-Policy'] || responseHeaders['content-security-policy'];
      if (csp) {
        const cspString = Array.isArray(csp) ? csp[0] : csp;
        const modifiedCsp = cspString
          .replace(
            /script-src[^;]*/,
            "script-src blob: data: 'self' 'unsafe-inline' 'unsafe-eval' wapp-assets: https://static.whatsapp.net 'wasm-unsafe-eval' https://*.youtube.com"
          )
          .replace(
            /connect-src[^;]*/,
            "connect-src 'self' http://localhost:* ws://localhost:* wss: https://web.whatsapp.com https://*.whatsapp.net https://*.whatsapp.com wapp-assets: https://*.google.com"
          );

        responseHeaders['Content-Security-Policy'] = [modifiedCsp];
        if (responseHeaders['content-security-policy']) {
          delete responseHeaders['content-security-policy'];
        }
      }

      callback({ responseHeaders });
    });

    // 监听 console 消息，输出到主进程
    this.view.webContents.on('console-message', (event) => {
      const level = event.level;
      const levelStr = level === 3 ? 'ERROR' : level === 2 ? 'WARNING' : level === 1 ? 'INFO' : 'DEBUG';
      console.log(`[WA-${this.accountId} Console] [${levelStr}] ${event.message}`);
    });

    // 监听所有未捕获的异常
    this.view.webContents.on('render-process-gone', (event, details) => {
      console.error(`[WA-${this.accountId}] Render process gone:`, details);
    });

    this.view.webContents.on('unresponsive', () => {
      console.warn(`[WA-${this.accountId}] View became unresponsive`);
    });

    this.view.webContents.on('responsive', () => {
      console.log(`[WA-${this.accountId}] View became responsive again`);
    });

    // 开发模式打开 DevTools
    if (process.env.ELECTRON_RENDERER_URL) {
      // this.view.webContents.openDevTools();
    }
  }

  /**
   * 设置 IPC 事件处理器
   */
  private setupIPCHandlers(): void {
    if (!this.view) return;

    // 创建 Messenger 实例（传入 WebContentsView 的 webContents 模拟窗口）
    // 注意：这里需要创建一个适配器，因为 Messenger 期望 BrowserWindow
    // 我们需要修改 Messenger 或者创建一个版本支持 WebContentsView
    this.messenger = this.createMessengerForView();

    // 监听 WA-JS 就绪事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.READY, () => {
      console.log(`WA-JS ready for account ${this.accountId}`);
      this.waJSReady = true;
      this.callbacks.onReady();
    });

    // 监听登录成功事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.LOGIN, () => {
      console.log(`Account ${this.accountId} logged in`);
      this.callbacks.onLogin();
    });

    // 监听用户信息事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.USER_INFO, (_event, data) => {
      const userInfo = data?.userInfo;
      console.log(`Account ${this.accountId} user info:`, userInfo);
      if (userInfo) {
        this.callbacks.onUserInfo(this.accountId, userInfo);
      }
    });

    // 监听登出事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.LOGOUT, () => {
      console.log(`Account ${this.accountId} logged out`);
      this.callbacks.onLogout();
    });

    // 监听消息接收事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.MESSAGE_RECEIVED, (_event, message) => {
      this.callbacks.onMessageReceived(this.accountId, message);
    });

    // 监听消息发送事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.MESSAGE_SENT, (_event, message) => {
      this.callbacks.onMessageSent(this.accountId, message);
    });

    // 监听错误事件
    this.messenger.on(WHATSAPP_WINDOW_CHANNELS.ERROR, (_event, error) => {
      console.error(`Account ${this.accountId} error:`, error);
      this.callbacks.onError(this.accountId, error);
    });
  }

  /**
   * 为 WebContentsView 创建 Messenger
   * 由于旧的 WhatsAppWindowMessenger 期望 BrowserWindow，这里创建一个轻量级适配器
   */
  private createMessengerForView(): WhatsAppViewMessenger {
    if (!this.view) {
      throw new Error('View not created');
    }

    // 创建一个轻量级的 Messenger 类来处理 WebContentsView
    return new WhatsAppViewMessenger(this.view, this.accountId);
  }

  /**
   * 加载 WhatsApp Web
   */
  async load(): Promise<void> {
    if (!this.view) {
      throw new Error('View not created');
    }

    try {
      await this.view.webContents.loadURL('https://web.whatsapp.com/');
      console.log(`WhatsApp Web loaded for account ${this.accountId}`);
    } catch (error) {
      this.callbacks.onError(
        this.accountId,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * 发送命令到视图
   */
  sendCommand(command: string, data?: any): void {
    this.messenger?.sendCommand(command, data);
  }

  /**
   * 聚焦视图
   */
  focus(): void {
    if (this.view && !this.view.webContents.isDestroyed()) {
      this.view.webContents.focus();
    }
  }

  /**
   * 检查视图是否已销毁
   */
  isDestroyed(): boolean {
    return !this.view || this.view.webContents.isDestroyed();
  }

  /**
   * 检查 wa-js 是否就绪
   */
  isReady(): boolean {
    return this.waJSReady;
  }

  /**
   * 关闭视图
   */
  async close(): Promise<void> {
    if (this.view && !this.view.webContents.isDestroyed()) {
      this.view.webContents.close();
    }
  }

  /**
   * 清理 IPC 监听器
   */
  cleanup(): void {
    this.messenger?.cleanup();
    this.messenger = null;
  }

  /**
   * 获取账号 ID
   */
  getAccountId(): string {
    return this.accountId;
  }

  /**
   * 获取视图实例
   */
  getBrowserView(): WebContentsView | null {
    return this.view;
  }
}

/**
 * WhatsApp View 消息发送器（适配 WebContentsView）
 * 与 WhatsAppWindowMessenger 类似，但使用 WebContentsView 的 webContents
 */
class WhatsAppViewMessenger {
  private view: WebContentsView;
  private accountId: string;
  private listeners: Map<string, (event: IpcMainEvent, ...args: any[]) => void> = new Map();

  constructor(view: WebContentsView, accountId: string) {
    this.view = view;
    this.accountId = accountId;
  }

  getAccountId(): string {
    return this.accountId;
  }

  sendCommand(command: string, data?: any): boolean {
    if (this.view.webContents.isDestroyed()) {
      console.error(`[ViewMessenger] View for ${this.accountId} is destroyed`);
      return false;
    }

    this.view.webContents.send(WHATSAPP_WINDOW_CHANNELS.COMMAND, {
      accountId: this.accountId,
      command,
      data,
    });

    return true;
  }

  on(
    channel: (accountId: string) => string,
    handler: (event: IpcMainEvent, ...args: any[]) => void
  ): void {
    const specificChannel = channel(this.accountId);
    console.log(`[ViewMessenger] Registering listener for ${this.accountId}: ${specificChannel}`);

    const listener = (event: IpcMainEvent, ...args: any[]) => {
      if (event.sender === this.view.webContents) {
        handler(event, ...args);
      } else {
        console.warn(`[ViewMessenger] Event ignored: sender mismatch for ${this.accountId}`);
      }
    };

    this.listeners.set(specificChannel, listener);
    ipcMain.on(specificChannel, listener);
  }

  cleanup(): void {
    for (const [channel, listener] of this.listeners) {
      ipcMain.removeListener(channel, listener);
    }
    this.listeners.clear();
  }
}
