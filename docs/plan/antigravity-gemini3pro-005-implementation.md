# 实施策略 (005)

## 1. 阶段一：Shell 搭建 (Frameless Window)
**目标**: 一个不仅能跑，而且长得像浏览器的 Vben App。

1.  **Vben 改造**:
    - 在 `electron/main.ts` 中设置 `frame: false, titleBarStyle: 'hidden'`.
    - 在 Vben 的 `Header` 组件中实现拖拽区域 (`-webkit-app-region: drag`)。
    - 在 Vben `Header` 右侧添加 最小化/最大化/关闭 按钮，绑定 IPC 事件。
2.  **Tab System 改造**:
    - 利用 Vben 现有的 `LayoutTabs` 组件。
    - 样式改造：使其看起来像 Chrome Tabs (梯形/圆角，紧凑排列)。
    - 逻辑改造：Tab 点击不再仅仅是路由跳转，而是触发 `BrowserView` 的切换。

## 2. 阶段二：View 引擎实现
**目标**: 实现 View 的无缝嵌入。

1.  **Placeholder**: 
    - 在 Vben 中创建一个透明页面 `/whatsapp/view`.
    - 该页面挂载时，立即通过 IPC 发送自己的 DOM `rect` 给主进程。
    - 页面销毁/隐藏时，通知主进程。
2.  **ViewService 集成**:
    - 实现 `openView`, `updateBounds`.
    - **调试重点**: 确保 Sidebar 收起/展开时，`BrowserView` 的宽度能平滑动画过渡 (可能需要高频发送 rect 更新，或在动画结束后更新)。

## 3. 阶段三：多账号业务闭环
**目标**: Admin UI 控制 Tabs。

1.  **Process Flow**:
    - Admin 页点击 "Add Account" -> 
    - 创建数据记录 (Pinia/DB) -> 
    - 自动打开新 Tab (Vben Route `/chat/new_id`) -> 
    - Main Process 收到路由信号 -> 
    - 创建 `BrowserView` (partition=`persist:account_new_id`) -> 
    - 加载 WhatsApp -> 
    - 用户扫码 -> 
    - Persistence 自动保存 Session。
2.  **Tab 管理**:
    - 验证关闭 Tab 后，Process 并没有销毁，Session 文件依然在。
    - 验证重启 App 后，点击对应账号，能直接恢复登录状态。

## 4. 阶段四：UI/UX 细节打磨
- **Loading 状态**: 在 `BrowserView` 还没加载出来时，Placeholder 显示 Loading Spinner。
- **右键菜单**: 为 BrowserView 实现原生的 Context Menu (复制/粘贴)。
- **Tab 拖拽**: 优化 Vben Tabs 的拖拽体验。
