import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { MainWindow } from './window/main-window';
import { registerWindowIpcHandlers } from './ipc';

/**
 * Application 单例类
 * 负责应用的生命周期管理和服务注册
 * 
 * 设计优势：
 * 1. 统一的初始化入口，便于依赖注入和测试
 * 2. 服务解耦，各模块职责清晰
 * 3. 为后续 TabManager、ProxyService 等扩展预留空间
 */
export class Application {
  private static instance: Application | null = null;
  private mainWindow: MainWindow | null = null;

  private constructor() {
    // 私有构造函数，确保单例
  }

  /**
   * 获取 Application 单例
   */
  public static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }
    return Application.instance;
  }

  /**
   * 启动应用
   */
  public async bootstrap(): Promise<void> {
    // 1. 注册 IPC 处理器（必须在窗口创建前）
    this.registerIpcHandlers();

    // 2. 设置应用级配置
    this.setupAppConfig();

    // 3. 注册应用事件
    this.registerAppEvents();

    // 4. 创建主窗口
    this.createMainWindow();
  }

  /**
   * 注册所有 IPC 处理器
   * 后续可在此扩展：registerTabIpcHandlers(), registerProxyIpcHandlers() 等
   */
  private registerIpcHandlers(): void {
    registerWindowIpcHandlers();
    // TODO: Step 8 - registerTabIpcHandlers();
    // TODO: Step 12 - registerProxyIpcHandlers();
  }

  /**
   * 设置应用级配置
   */
  private setupAppConfig(): void {
    // 设置应用 ID（用于 Windows 任务栏分组）
    electronApp.setAppUserModelId('com.wpp.desktop');

    // 开发环境中 F12 打开开发者工具
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
  }

  /**
   * 注册应用级事件
   */
  private registerAppEvents(): void {
    // macOS: 点击 Dock 图标时重新激活窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      } else {
        this.mainWindow?.focus();
      }
    });

    // 所有窗口关闭时退出（非 macOS）
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  /**
   * 创建主窗口
   */
  private createMainWindow(): void {
    this.mainWindow = new MainWindow();
  }

  /**
   * 获取主窗口实例
   */
  public getMainWindow(): MainWindow | null {
    return this.mainWindow;
  }
}
