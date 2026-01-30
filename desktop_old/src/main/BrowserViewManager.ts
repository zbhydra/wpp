import { app, BrowserWindow, WebContentsView } from 'electron';
import * as path from 'path';
import { getMainPreloadPath } from './utils/paths';
import { TAB_CHANNELS } from '../shared/ipc/channels';
import { debugLog, debugPerf, DEBUG_MODE } from './utils/debug';

/**
 * 标签栏高度（像素）
 */
const TAB_BAR_HEIGHT = 40;

/**
 * 视图元数据
 */
interface ViewMetadata {
  type: 'admin' | 'whatsapp' | 'tabbar';
  accountId?: string;
}

/**
 * WebContentsView 管理器
 * 管理主窗口中的多个 WebContentsView（TabBar + 管理页 + WhatsApp 页）
 */
export class BrowserViewManager {
  private mainWindow: BrowserWindow;
  private views: Map<string, WebContentsView> = new Map();
  private activeViewId: string | null = null;
  private viewMetadata: Map<string, ViewMetadata> = new Map();
  private isMac: boolean;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.isMac = process.platform === 'darwin';
    this.setupWindowResizeHandler();
  }

  /**
   * 创建 TabBar 视图（始终显示在顶部）
   */
  createTabBarView(): void {
    const viewId = 'tabbar';

    if (this.views.has(viewId)) {
      return;
    }

    const createStart = Date.now();
    debugPerf('→ Starting creation...');

    const bvStart = Date.now();
    const view = new WebContentsView({
      webPreferences: {
        // 不使用 preload，直接在 HTML 中使用 electron API
        contextIsolation: false,
        nodeIntegration: true,
        webSecurity: false,
      },
    });
    view.setBackgroundColor('#00000000'); // 透明背景
    debugPerf('✓ new WebContentsView():', Date.now() - bvStart, 'ms');

    this.views.set(viewId, view);
    this.viewMetadata.set(viewId, { type: 'tabbar' });

    // 加载一个简单的 TabBar 页面
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background-color: #2c3e50;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            overflow: hidden;
            user-select: none;
            -webkit-app-region: drag; /* 窗口可拖动 */
          }
          .title-bar {
            display: flex;
            align-items: center;
            height: 40px;
            background-color: #2c3e50;
            border-bottom: 1px solid #1a252f;
          }

          /* Mac 红绿灯占位空间 */
          .traffic-lights-spacer {
            width: 80px;
            height: 100%;
            flex-shrink: 0;
          }

          /* Mac: 隐藏自定义按钮 */
          .title-bar-mac .window-controls {
            display: none;
          }

          .window-controls {
            display: flex;
            align-items: center;
            height: 100%;
            -webkit-app-region: no-drag; /* 按钮不可拖动 */
          }
          #tab-bar-container {
            flex: 1;
            height: 100%;
            overflow: hidden;
            display: flex;
          }
          #tab-bar {
            display: flex;
            height: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            flex: 1;
          }
          #tab-bar::-webkit-scrollbar {
            display: none;
          }
          .drag-area {
            width: 80px;
            height: 100%;
            flex-shrink: 0;
            -webkit-app-region: drag;
          }
          .tab-item {
            display: flex;
            align-items: center;
            padding: 0 12px;
            cursor: pointer;
            border-right: 1px solid #1a252f;
            background-color: #34495e;
            min-width: 50px;
            max-width: 120px;
            flex-shrink: 1;
            flex-grow: 0;
            color: #ecf0f1;
            height: 100%;
            -webkit-app-region: no-drag; /* tab 不可拖动，防止点击失效 */
          }
          .tab-item:hover {
            background-color: #3d566e;
          }
          .tab-item.active {
            background-color: #42b983;
            color: #fff;
          }
          .tab-title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .tab-close {
            margin-left: 4px;
            font-size: 16px;
            color: #bdc3c7;
            cursor: pointer;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
            flex-shrink: 0;
          }
          .tab-close:hover {
            color: #fff;
            background-color: rgba(255, 255, 255, 0.2);
          }
          .window-controls-right {
            display: flex;
            align-items: center;
            height: 100%;
            flex-shrink: 0;
            z-index: 1001;
          }
          .window-control-btn {
            width: 46px;
            height: 100%;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 12px;
            transition: background-color 0.2s;
            -webkit-app-region: no-drag;
          }
          .window-control-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
          .window-control-btn.close:hover {
            background-color: #e81123;
          }
        </style>
      </head>
      <body>
        <div class="title-bar ${this.isMac ? 'title-bar-mac' : 'title-bar-windows'}">
          ${this.isMac ? '<div class="traffic-lights-spacer"></div>' : ''}
          <div id="tab-bar-container">
            <div id="tab-bar"></div>
          </div>
          <div class="drag-area"></div>
          ${!this.isMac ? `
          <div class="window-controls window-controls-right">
            <button class="window-control-btn" id="minimize-btn" title="最小化">─</button>
            <button class="window-control-btn" id="maximize-btn" title="最大化">□</button>
            <button class="window-control-btn close" id="close-btn" title="关闭">×</button>
          </div>
          ` : ''}
        </div>
        <script>
          const { ipcRenderer } = require('electron');

          // 调试开关（从主进程传入）
          const DEBUG_MODE = ${DEBUG_MODE};
          const isMac = ${this.isMac};

          // 标签数据
          let tabs = [{ id: 'admin', title: 'WPP Manager', closable: false }];
          let activeTabId = 'admin';

          // 防止重复调用
          let isClosing = new Set();

          // 渲染标签栏
          function renderTabBar() {
            const tabBar = document.getElementById('tab-bar');
            tabBar.innerHTML = tabs.map(tab => \`
              <div class="tab-item \${tab.id === activeTabId ? 'active' : ''}" data-id="\${tab.id}">
                <span class="tab-title">\${tab.title}</span>
                \${tab.closable ? '<span class="tab-close">×</span>' : ''}
              </div>
            \`).join('');
          }

          // 使用事件委托，只绑定一次
          document.getElementById('tab-bar').addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-item');
            if (!tabItem) return;

            const tabId = tabItem.dataset.id;

            // 点击关闭按钮
            if (e.target.classList.contains('tab-close')) {
              if (tabs.find(t => t.id === tabId)?.closable && !isClosing.has(tabId)) {
                isClosing.add(tabId);
                ipcRenderer.invoke('tab:close', tabId).then(() => {
                  isClosing.delete(tabId);
                }).catch(() => {
                  isClosing.delete(tabId);
                });
              }
              return;
            }

            // 点击切换标签
            if (tabId !== activeTabId) {
              activeTabId = tabId;
              ipcRenderer.invoke('tab:switch', tabId);
              renderTabBar();
            }
          });

          // 监听标签页事件
          ipcRenderer.on('tab:created', (_event, tab) => {
            if (DEBUG_MODE) console.log('[TabBar] Tab created:', tab);
            if (!tabs.find(t => t.id === tab.id)) {
              tabs.push({ id: tab.id, title: tab.title, closable: true });
              renderTabBar();
            }
          });

          ipcRenderer.on('tab:closed', (_event, tabId) => {
            if (DEBUG_MODE) console.log('[TabBar] Tab closed:', tabId);
            const index = tabs.findIndex(t => t.id === tabId);
            if (index > -1) {
              tabs.splice(index, 1);
              if (activeTabId === tabId) {
                activeTabId = tabs[Math.max(0, index - 1)]?.id || 'admin';
              }
              renderTabBar();
            }
          });

          ipcRenderer.on('tab:switched', (_event, tabId) => {
            if (DEBUG_MODE) console.log('[TabBar] Tab switched:', tabId);
            activeTabId = tabId;
            renderTabBar();
          });

          // 窗口控制按钮事件（仅 Windows/Linux）
          if (!isMac) {
            document.getElementById('minimize-btn').addEventListener('click', () => {
              ipcRenderer.send('window:minimize');
            });

            document.getElementById('maximize-btn').addEventListener('click', () => {
              ipcRenderer.send('window:maximize');
            });

            document.getElementById('close-btn').addEventListener('click', () => {
              ipcRenderer.send('window:close');
            });
          }

          // 初始渲染
          renderTabBar();
          if (DEBUG_MODE) console.log('[TabBar] Initialized');
        </script>
      </body>
      </html>
    `;

    view.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    view.webContents.on('did-finish-load', () => {
      const loadTime = Date.now() - createStart;
      debugPerf('✓ did-finish-load total:', loadTime, 'ms');
    });

    view.webContents.on('did-start-loading', () => {
      debugPerf('→ did-start-loading');
    });

    view.webContents.on('dom-ready', () => {
      debugPerf('✓ dom-ready:', Date.now() - createStart, 'ms');
    });

    view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[BrowserViewManager] TabBar view failed to load:', errorCode, errorDescription);
    });

    // TabBar 始终添加到窗口并固定在顶部
    this.mainWindow.contentView.addChildView(view);
    const [width, height] = this.mainWindow.getSize();
    view.setBounds({
      x: 0,
      y: 0,
      width: width,
      height: TAB_BAR_HEIGHT,
    });

    debugLog('TabBar view created and added to window');
  }

  /**
   * 创建管理视图（加载 renderer 内容）
   */
  createAdminView(): string {
    const viewId = 'admin';
    const createStart = Date.now();

    if (this.views.has(viewId)) {
      return viewId;
    }

    debugPerf('========== Starting creation ==========');

    // 获取 preload 路径并记录
    const preloadPath = getMainPreloadPath();
    debugPerf('Preload path:', preloadPath);

    const bvStart = Date.now();
    const view = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });
    view.setBackgroundColor('#00000000'); // 透明背景
    debugPerf('✓ new WebContentsView():', Date.now() - bvStart, 'ms');

    this.views.set(viewId, view);
    this.viewMetadata.set(viewId, { type: 'admin' });

    // 设置 CSP
    const cspStart = Date.now();
    view.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:* ws://localhost:* https://web.whatsapp.com https://*.whatsapp.net; img-src 'self' data: blob: https:; font-src 'self' data:; object-src 'none'; frame-src 'self' https://web.whatsapp.com;",
          ],
        },
      });
    });
    debugPerf('✓ CSP setup:', Date.now() - cspStart, 'ms');

    // 监听加载事件的各个阶段
    view.webContents.on('did-start-loading', () => {
      debugPerf('→ did-start-loading:', Date.now() - createStart, 'ms');
    });

    view.webContents.on('did-navigate', (event) => {
      debugPerf('→ did-navigate:', Date.now() - createStart, 'ms', 'url:', event.url);
    });

    view.webContents.on('did-navigate-in-page', (event) => {
      debugPerf('→ did-navigate-in-page:', Date.now() - createStart, 'ms', 'url:', event.url, 'isMainFrame:', event.isMainFrame);
    });

    view.webContents.on('dom-ready', () => {
      debugPerf('✓ dom-ready:', Date.now() - createStart, 'ms');
    });

    view.webContents.on('did-finish-load', () => {
      debugPerf('→ did-finish-load:', Date.now() - createStart, 'ms');
    });

    view.webContents.on('did-frame-finish-load', () => {
      debugPerf('✓ did-frame-finish-load:', Date.now() - createStart, 'ms');
    });

    view.webContents.on('did-create-window', (event) => {
      debugPerf('→ did-create-window:', Date.now() - createStart, 'ms');
    });

    // 加载 renderer 内容
    const loadStart = Date.now();
    debugPerf('→ Calling loadFile/loadURL...');

    // electron-vite 最佳实践：开发环境用 dev server，生产环境用 file://
    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      const url = process.env['ELECTRON_RENDERER_URL'];
      debugPerf('Loading via electron-vite dev server:', url);
      view.webContents.loadURL(url);
    } else {
      const indexPath = path.join(__dirname, '../renderer/index.html');
      debugPerf('Loading index.html:', indexPath);
      view.webContents.loadFile(indexPath);
    }

    debugPerf('✓ loadFile/loadURL called:', Date.now() - loadStart, 'ms');

    // 监听 console 消息
    view.webContents.on('console-message', (event) => {
      const level = event.level;
      const levelStr = level === 3 ? 'ERROR' : level === 2 ? 'WARNING' : level === 1 ? 'INFO' : 'DEBUG';
      // 将对象转换为 JSON 字符串以便查看
      const message = typeof event.message === 'object'
        ? JSON.stringify(event.message, null, 2)
        : String(event.message);
      console.log(`[Admin View Console] [${levelStr}] ${message}`);
    });

    // 监听加载完成
    view.webContents.on('did-finish-load', () => {
      const loadTime = Date.now() - createStart;
      debugPerf('✓ did-finish-load TOTAL:', loadTime, 'ms');
      debugPerf('========== Creation complete ==========');
    });

    view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Admin Perf] ✗ did-fail-load:', errorCode, errorDescription);
    });

    // 初始设置为活跃视图
    this.setActiveView(viewId);

    return viewId;
  }

  /**
   * 添加外部创建的 WhatsApp WebContentsView
   */
  addWhatsAppView(viewId: string, view: WebContentsView): void {
    this.views.set(viewId, view);
    this.viewMetadata.set(viewId, { type: 'whatsapp', accountId: viewId });

    // 设置视图边界（从 TabBar 下方开始）
    this.updateViewBounds(view);

    // 添加到窗口但不显示
    try {
      this.mainWindow.contentView.addChildView(view);
      this.mainWindow.contentView.removeChildView(view);
    } catch (e) {
      console.error(`Failed to add view ${viewId}:`, e);
    }
  }

  /**
   * 切换活跃视图
   */
  setActiveView(viewId: string): void {
    if (!this.views.has(viewId)) {
      console.warn(`View ${viewId} not found`);
      return;
    }

    // 先移除所有非 TabBar 的视图
    for (const [id, view] of this.views.entries()) {
      if (id !== 'tabbar') {
        try {
          this.mainWindow.contentView.removeChildView(view);
        } catch (e) {
          // 忽略，可能不在窗口中
        }
      }
    }

    // 先添加目标视图并设置边界（底部）
    const targetView = this.views.get(viewId);
    if (targetView && viewId !== 'tabbar') {
      this.mainWindow.contentView.addChildView(targetView);
      this.updateViewBounds(targetView);
    }

    // 最后添加 TabBar（确保在顶部）
    const tabBarView = this.views.get('tabbar');
    if (tabBarView) {
      try {
        this.mainWindow.contentView.addChildView(tabBarView);
      } catch (e) {
        // 可能已添加，忽略
      }
    }

    this.activeViewId = viewId;
  }

  /**
   * 关闭视图
   */
  async closeView(viewId: string): Promise<void> {
    // TabBar 和管理视图不可关闭
    if (viewId === 'tabbar' || viewId === 'admin') {
      console.warn(`Cannot close ${viewId} view`);
      return;
    }

    const view = this.views.get(viewId);
    if (!view) {
      console.warn(`View ${viewId} not found, already closed?`);
      return;
    }

    // 从窗口移除
    try {
      this.mainWindow.contentView.removeChildView(view);
    } catch (e) {
      console.warn(`Failed to remove view ${viewId}:`, e);
    }

    // 销毁视图
    try {
      if (!view.webContents.isDestroyed()) {
        view.webContents.close();
      }
    } catch (e) {
      console.warn(`Failed to close view ${viewId}:`, e);
    }

    // 从 Map 中移除
    this.views.delete(viewId);
    this.viewMetadata.delete(viewId);

    // 通知 TabBar 更新
    const tabBarView = this.views.get('tabbar');
    if (tabBarView && !tabBarView.webContents.isDestroyed()) {
      tabBarView.webContents.send(TAB_CHANNELS.TAB_CLOSED, viewId);
    }

    // 如果关闭的是当前视图，切换到 admin 视图
    if (this.activeViewId === viewId) {
      this.setActiveView('admin');
    }

    console.log(`View ${viewId} closed successfully`);
  }

  /**
   * 获取视图
   */
  getView(viewId: string): WebContentsView | null {
    return this.views.get(viewId) || null;
  }

  /**
   * 获取活跃视图 ID
   */
  getActiveViewId(): string | null {
    return this.activeViewId;
  }

  /**
   * 检查视图是否存在
   */
  hasView(viewId: string): boolean {
    return this.views.has(viewId);
  }

  /**
   * 获取所有视图 ID
   */
  getViewIds(): string[] {
    return Array.from(this.views.keys());
  }

  /**
   * 获取视图元数据
   */
  getViewMetadata(viewId: string): ViewMetadata | undefined {
    return this.viewMetadata.get(viewId);
  }

  /**
   * 更新视图边界
   */
  private updateViewBounds(view: WebContentsView): void {
    const [width, height] = this.mainWindow.getSize();
    view.setBounds({
      x: 0,
      y: TAB_BAR_HEIGHT,
      width: width,
      height: height - TAB_BAR_HEIGHT,
    });
  }

  /**
   * 设置窗口大小调整处理器
   */
  private setupWindowResizeHandler(): void {
    this.mainWindow.on('resize', () => {
      const [width, height] = this.mainWindow.getSize();
      const isMaximized = this.mainWindow.isMaximized();
      debugLog('Window resized to:', width, 'x', height, 'maximized:', isMaximized);

      // Mac 最大化没有边框；Windows/Linux 最大化时需要留出一些边距
      // 通常 Windows 最大化窗口会有不可见的边框
      const contentWidth = (this.isMac || !isMaximized) ? width : width - 12;
      const contentHeight = (this.isMac || !isMaximized) ? height : height - 12;

      // 确保 TabBar 正确添加并更新边界
      const tabBarView = this.views.get('tabbar');
      if (tabBarView) {
        try {
          this.mainWindow.contentView.addChildView(tabBarView);
          tabBarView.setBounds({
            x: 0,
            y: 0,
            width: contentWidth,
            height: TAB_BAR_HEIGHT,
          });
          debugLog('TabBar bounds updated:', { width: contentWidth, height: TAB_BAR_HEIGHT });
        } catch (e) {
          console.warn('[BrowserViewManager] Failed to update TabBar bounds:', e);
        }
      }

      // 更新当前活跃视图的边界
      if (this.activeViewId && this.activeViewId !== 'tabbar') {
        const activeView = this.views.get(this.activeViewId);
        if (activeView) {
          try {
            this.mainWindow.contentView.addChildView(activeView);
            activeView.setBounds({
              x: 0,
              y: TAB_BAR_HEIGHT,
              width: contentWidth,
              height: contentHeight - TAB_BAR_HEIGHT,
            });
            debugLog(`Active view ${this.activeViewId} bounds updated:`, { width: contentWidth, height: contentHeight - TAB_BAR_HEIGHT });
          } catch (e) {
            console.warn(`[BrowserViewManager] Failed to update view ${this.activeViewId} bounds:`, e);
          }
        }
      }
    });
  }

  /**
   * 清理所有视图
   */
  async cleanup(): Promise<void> {
    // 先关闭所有 WhatsApp 视图
    const whatsappViewIds = this.getViewIds().filter(
      (id) => this.viewMetadata.get(id)?.type === 'whatsapp'
    );

    for (const viewId of whatsappViewIds) {
      await this.closeView(viewId);
    }

    // 保留 tabbar 和 admin view，不清理
    this.activeViewId = null;
  }
}
