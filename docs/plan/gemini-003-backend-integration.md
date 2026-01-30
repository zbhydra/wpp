# 003. 主进程核心逻辑移植 (Main Process Integration)

本阶段是整个迁移工作中最复杂的部分。我们需要将 `desktop_old` 的逻辑移植到 `apps/electron-main` 中，并适配 Electron 39+ 的 API。

## 1. 核心类移植清单

我们需要创建以下文件结构：

```
apps/electron-main/src/
├── main.ts                 # 入口文件 (App生命周期)
├── config/
│   └── paths.ts            # 路径配置 (userData, resource 等)
├── core/
│   ├── ViewManager.ts      # [重点] 视图管理器
│   ├── SessionFactory.ts   # [重点] 会话/分区工厂
│   └── WindowManager.ts    # 主窗口管理
├── services/
│   ├── AccountManager.ts   # 账号 CRUD
│   └── EventService.ts     # IPC 消息总线
├── ipc/
│   ├── index.ts            # IPC 注册入口
│   └── handlers/           # 各个模块的 handler
└── utils/
    └── logger.ts
```

## 2. 关键模块实现详情

### 2.1 `SessionFactory.ts` (隔离的核心)

这是实现 **"10个账号完全隔离 + 独立代理"** 的关键类。

```typescript
import { session, Session } from 'electron';

export class SessionFactory {
  /**
   * 获取或创建指定账号的 Session
   * @param accountId 账号ID
   * @param proxyUrl 代理地址 (e.g. "socks5://127.0.0.1:7890")
   */
  static async getSession(accountId: string, proxyUrl?: string): Promise<Session> {
    // 1. 生成唯一的 partition 字符串
    // persist: 前缀表示持久化存储，重启后 Cookie 还在
    const partition = `persist:wa_${accountId}`;
    
    // 2. 获取 session 实例 (Electron 会自动管理缓存)
    const sess = session.fromPartition(partition);

    // 3. 配置代理
    if (proxyUrl) {
      await sess.setProxy({
        proxyRules: proxyUrl,
        proxyBypassRules: 'localhost'
      });
      console.log(`[Session] Account ${accountId} proxy set to ${proxyUrl}`);
    } else {
      // 清除代理 (直连)
      await sess.setProxy({ proxyRules: '', mode: 'direct' });
    }

    // 4. 配置权限 (拒绝不需要的权限请求)
    sess.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowed = ['notifications', 'media']; // 根据需要调整
      callback(allowed.includes(permission));
    });

    return sess;
  }

  /**
   * 清除该账号的所有数据 (Cookie, Cache, Storage)
   */
  static async clearSession(accountId: string) {
    const sess = await this.getSession(accountId);
    await sess.clearCache();
    await sess.clearStorageData();
  }
}
```

### 2.2 `ViewManager.ts` (混合渲染的核心)

负责创建 `WebContentsView` 并将其挂载到主窗口。

```typescript
import { WebContentsView, BaseWindow } from 'electron';
import { SessionFactory } from './SessionFactory';

export class ViewManager {
  private views: Map<string, WebContentsView> = new Map();
  private mainWindow: BaseWindow;

  constructor(mainWindow: BaseWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * 创建或获取一个 WA 视图
   */
  async getOrCreateView(accountId: string, proxyUrl?: string): Promise<WebContentsView> {
    if (this.views.has(accountId)) {
      return this.views.get(accountId)!;
    }

    // 1. 获取隔离的 Session
    const sess = await SessionFactory.getSession(accountId, proxyUrl);

    // 2. 创建 WebContentsView (Electron 39 新 API，替代 BrowserView)
    const view = new WebContentsView({
      webPreferences: {
        session: sess,
        preload: path.join(__dirname, '../preload/whatsapp.js'), // 注入脚本
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false // 极其重要：防止后台节流导致掉线
      }
    });

    // 3. 加载 WhatsApp
    view.webContents.loadURL('https://web.whatsapp.com');
    
    // 4. 存储引用
    this.views.set(accountId, view);
    return view;
  }

  /**
   * 将视图显示在主窗口的特定区域
   */
  async attachView(accountId: string, rect: Electron.Rectangle) {
    const view = await this.getOrCreateView(accountId);
    
    // 1. 添加到主窗口 (如果还没添加)
    // 注意：contentView 是 Electron 39 管理子视图的新对象
    if (!this.mainWindow.contentView.children.includes(view)) {
      this.mainWindow.contentView.addChildView(view);
    }

    // 2. 设置位置和大小
    view.setBounds(rect);
    
    // 3. 确保它在最上层 (如果需要)
    // view.setVisible(true);
  }

  /**
   * 隐藏视图 (不销毁，保持后台运行)
   */
  detachView(accountId: string) {
    const view = this.views.get(accountId);
    if (view && this.mainWindow.contentView.children.includes(view)) {
      this.mainWindow.contentView.removeChildView(view);
    }
  }
}
```

### 2.3 `preload/whatsapp.ts` (注入脚本)

移植 `desktop_old/src/preload/whatsapp-preload` 的逻辑。
主要工作：
1.  **环境伪装**：移除 `window.process`，修改 UserAgent，防止被 WA 识别为 Electron 机器人。
2.  **WPPConnect 注入**：读取本地的 `wa-js` 库内容并执行。
3.  **IPC 桥接**：将 `WPP.on('message')` 等事件转发给主进程。

## 3. 数据库与持久化

为了快速迁移，初期建议沿用 `desktop_old` 的 JSON 文件存储方案。
使用 `electron-store` 或 `fs-extra` 直接读写 JSON。

*   `accounts.json`: 存储账号列表、代理配置、备注名。
*   `sessions.json`: 存储登录状态 (Ready, LoggedIn, etc.)。

## 4. 安全性增强 (CSP)

在 `main.ts` 中配置 CSP：

```typescript
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: wapp-assets: https://*.whatsapp.com wss://*.whatsapp.com"
      ]
    }
  });
});
```

**下一步**：阅读 `gemini-004-frontend-implementation.md`，了解如何在 Vben 中控制这些视图。
