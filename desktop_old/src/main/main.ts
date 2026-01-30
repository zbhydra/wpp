import { app, BrowserWindow, protocol, net, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { WhatsAppAccountManager } from './whatsapp/WhatsAppAccountManager';
import { BrowserViewManager } from './BrowserViewManager';
import { setupIPCHandlers } from './ipc';
import { getMainPreloadPath } from './utils/paths';
import { debugLog, debugPerf, DEBUG_MODE } from './utils/debug';

// 导出调试开关供其他模块使用
export { debugLog, debugPerf, DEBUG_MODE };

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('[Main Process] Uncaught Exception:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

// 监听所有 console 输出，添加标记
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  originalLog('[Main]', ...args);
};

console.error = (...args: any[]) => {
  originalError('[Main ERROR]', ...args);
};

console.warn = (...args: any[]) => {
  originalWarn('[Main WARN]', ...args);
};

console.log('[Main] Application starting...');

// 性能测试：记录启动开始时间
const startupStartTime = Date.now();
debugPerf('Startup timer started at', startupStartTime);

let mainWindow: BrowserWindow | null = null;
let browserViewManager: BrowserViewManager | null = null;
let accountManager: WhatsAppAccountManager | null = null;

// 设置全局 User-Agent，隐藏 Electron 身份
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

app.userAgentFallback = CHROME_USER_AGENT;

// 禁用 CSP 警告（仅开发环境）
if (process.env.ELECTRON_RENDERER_URL) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

// 创建主窗口
function createWindow(): void {
  const createWindowStart = Date.now();
  debugPerf('========== createWindow started ==========');
  debugPerf('createWindow started at', createWindowStart, `(+${createWindowStart - startupStartTime}ms)`);

  // 平台检测：Mac 使用原生红绿灯，Windows/Linux 使用自定义按钮
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    // Mac: hiddenInset 显示原生红绿灯，Windows/Linux: frame 完全自定义
    ...(isMac ? {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 14 },
    } : {
      frame: false,
    }),
    webPreferences: {
      // 主窗口不需要 preload，由 BrowserView 各自设置
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    },
  });

  // 完全隐藏菜单栏
  mainWindow.setMenuBarVisibility(false);

  const windowCreatedTime = Date.now();
  debugPerf('✓ BrowserWindow created:', windowCreatedTime - createWindowStart, 'ms');

  // 创建 BrowserViewManager
  const bvmStart = Date.now();
  browserViewManager = new BrowserViewManager(mainWindow);
  debugPerf('✓ BrowserViewManager new():', Date.now() - bvmStart, 'ms');

  // 创建 TabBar 视图（始终显示在顶部）
  const tabBarStart = Date.now();
  debugPerf('→ Creating TabBar...');
  browserViewManager.createTabBarView();
  debugPerf('✓ TabBar createTabBarView():', Date.now() - tabBarStart, 'ms');

  // 创建管理视图（加载 renderer 内容）
  const adminStart = Date.now();
  debugPerf('→ Creating Admin view...');
  browserViewManager.createAdminView();
  debugPerf('✓ Admin createAdminView():', Date.now() - adminStart, 'ms');

  // 创建账号管理器
  const amStart = Date.now();
  accountManager = new WhatsAppAccountManager(mainWindow, browserViewManager);
  debugPerf('✓ WhatsAppAccountManager new():', Date.now() - amStart, 'ms');

  // 设置 IPC handlers
  const ipcStart = Date.now();
  setupIPCHandlers(accountManager, browserViewManager);
  debugPerf('✓ setupIPCHandlers():', Date.now() - ipcStart, 'ms');

  const totalSetupTime = Date.now() - createWindowStart;
  debugPerf('========== Total setup time:', totalSetupTime, 'ms ==========');

  // 窗口控制
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  // 窗口关闭时清理所有资源
  mainWindow.on('close', async () => {
    if (browserViewManager) {
      await browserViewManager.cleanup();
    }
    if (accountManager) {
      await accountManager.cleanup();
    }
  });

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
    browserViewManager = null;
  });
}

// 注册自定义协议来提供 wa-js 脚本
function registerWaAssetsProtocol(): void {
  protocol.handle('wapp-assets', (request) => {
    const url = request.url.slice('wapp-assets://'.length);
    // 解析路径: wapp-assets:///wa.js 或 wapp-assets:///wapi.js
    let filePath: string;

    if (url === '/wa.js') {
      // wa-js 库文件 - 使用 require.resolve 动态解析
      try {
        const waJsPackagePath = require.resolve('@wppconnect/wa-js');
        filePath = path.join(path.dirname(waJsPackagePath), 'dist/wppconnect-wa.js');
      } catch {
        // 备用路径
        filePath = path.join(__dirname, '../../node_modules/@wppconnect/wa-js/dist/wppconnect-wa.js');
      }
    } else if (url === '/wapi.js') {
      // wapi 文件 - 使用 require.resolve 动态解析
      try {
        const wppconnectPackagePath = require.resolve('@wppconnect-team/wppconnect');
        filePath = path.join(path.dirname(wppconnectPackagePath), 'dist/lib/wapi/wapi.js');
      } catch {
        // 备用路径
        filePath = path.join(__dirname, '../../node_modules/@wppconnect-team/wppconnect/dist/lib/wapi/wapi.js');
      }
    } else {
      return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }

    try {
      const data = fs.readFileSync(filePath);
      return new Response(data, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
      });
    } catch (error) {
      console.error('[Protocol] Failed to read file:', filePath, error);
      return new Response('File Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
  });
  debugLog('wapp-assets protocol registered');
}

// 应用就绪时创建窗口
app.whenReady().then(() => {
  // 注册自定义协议
  registerWaAssetsProtocol();

  // 创建窗口（electron-vite 会自动启动 dev server）
  createWindow();

  // macOS 点击 Dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（所有平台）
app.on('window-all-closed', async () => {
  if (accountManager) {
    await accountManager.cleanup();
  }
  app.quit();
});

// 应用退出前清理
app.on('before-quit', async () => {
  if (accountManager) {
    await accountManager.cleanup();
  }
});
