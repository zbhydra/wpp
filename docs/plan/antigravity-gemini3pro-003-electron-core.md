# Electron 核心架构实现 (003)

## 1. 核心服务：`ViewService` (视图管理器)

这是实现 "浏览器体验" 的关键。它不仅管理 `BrowserView` 的生命周期，还负责复杂的坐标同步。

### 1.1 职责
- **多 Tab 管理**: 维护 `Map<accountId, BrowserView>`。
- **混合渲染 (Hybrid Rendering)**: 
    - 知道当前是在显示 "原生 Admin UI" 还是 "WhatsApp View"。
    - 当显示 Admin UI 时，自动隐藏所有 Views。
- **布局同步**:
    - 接收前端发来的 `rect` (内容区域的 x, y, width, height)。
    - 自动调整当前激活 View 的 `setBounds(rect)`。
    - 处理窗口 `resize` 事件，确保 View 始终填满内容区。

### 1.2 代码蓝图 (Simplified)
```typescript
class ViewService {
  private views = new Map<string, BrowserView>();
  private activeAccountId: string | null = null;
  private contentBounds: Rectangle = { x: 0, y: 0, width: 0, height: 0 };

  // 创建或获取 View (核心隔离逻辑)
  async openView(accountId: string) {
    let view = this.views.get(accountId);
    if (!view) {
      view = new BrowserView({
        webPreferences: {
          partition: `persist:account_${accountId}`, // [重点] 物理隔离 & 持久化
          preload: WA_PRELOAD_PATH
        }
      });
      view.webContents.loadURL('https://web.whatsapp.com');
      this.views.set(accountId, view);
    }
    this.switchView(accountId);
  }

  // 切换显示
  switchView(accountId: string) {
    const view = this.views.get(accountId);
    this.MainWindow.setBrowserView(view); // 挂载
    view.setBounds(this.contentBounds);   // 设置坐标
    this.activeAccountId = accountId;
  }
  
  // 切回 Admin
  showAdmin() {
    this.MainWindow.setBrowserView(null); // 卸载所有 View
    this.activeAccountId = null;
  }
}
```

## 2. 核心服务：`WhatsAppService` (业务逻辑)

### 2.1 注入与反检测
- 既然要求 "最佳实践"，我们将把所有 DOM 操作注入逻辑放在 `preload` 脚本中，而不是在主进程使用 `executeJavaScript`。
- 伪造 UserAgent, Navigator 属性，确保不被 WA 识别为机器人。

## 3. 通信协议 (Typed IPC)

为了支持 Admin UI 监控 Tab 状态，我们需要双向实时通信。

**Main -> Renderer (广播)**
```typescript
// 定义事件
interface WhatsAppEvents {
  'wa:status-change': (event: IpcRendererEvent, accountId: string, status: ConnectionStatus) => void;
  'wa:message': (event: IpcRendererEvent, accountId: string, message: any) => void;
}
```

**Renderer -> Main (调用)**
```typescript
interface WhatsAppMethods {
  'wa:create': (config: AccountConfig) => Promise<string>;
  'wa:close': (accountId: string) => Promise<void>;
  'app:window-control': (action: 'minimize' | 'maximize' | 'close') => Promise<void>;
}
```
*注意*: 窗口控制 (`maximize` 等) 也通过 IPC 发送，因为我们将隐藏系统原生标题栏。
