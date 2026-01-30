# 重构方案概览 (001)

## 1. 核心产品形态: "定制化浏览器"
根据您的需求，我们将构建一个类似 Chrome 的多标签页应用。

*   **唯一窗口**: 应用启动后只有一个主窗口。
*   **顶部 Tab栏**: 包含 "Admin Panel" (固定/默认) 和多个 "WhatsApp Tabs"。集成窗口控制按钮 (最小化/最大化/关闭)。
*   **内容区域**: 
    - 当激活 "Admin Panel" Tab 时，显示 Vue 编写的管理后台 (Vben Admin)。
    - 当激活 "WhatsApp" Tab 时，显示完全隔离的 Web 内容 (`BrowserView`)。

## 2. 关键技术实现

### 2.1 隔离性与持久化 (Isolation & Persistence)
这是核心需求。我们利用 Electron 的 `session` 分区 (`partition`) 机制来实现。

*   **Admin UI**: 使用默认 session (`persist:main`)。
*   **WhatsApp Tabs**: 每个 Tab 分配一个唯一的 `partition` 字符串，格式为 `persist:account_${id}`。
    - **效果**: 即使两个 Tab 都是打开 `whatsapp.com`，它们的 Cookies, LocalStorage, IndexedDB 也是完全物理隔离的，互不干扰。
    - **持久化**: `persist:` 前缀确保数据写入磁盘。关闭 Tab 或重启应用后，只要使用相同的 `account_id` 创建 View，状态依然存在 (免登录)。

### 2.2 布局架构 (The Layout)
为了实现 "Admin UI 和 Tabs 是一体的"，我们将采用 **Vben App 作为 Shell** 的方案。

*   **Window**: 设置为无边框窗口 (`frame: false`)。
*   **Renderer (Vben)**:
    - **Header**: 改造为自定义 TitleBar，包含 App Logo, **Tabs (使用 Vben 的 MultiTab 组件改造)**, Window Controls。
    - **Body**: 
        - 路由 `/dashboard`: 渲染管理后台页面。
        - 路由 `/chat/:id`: 渲染一个**透明/空白占位符**。
*   **Main Process (Electron)**:
    - **ViewService**: 监听路由变化。
        - 当路由切到 `/chat/123`: 将对应的 `BrowserView` (partition: account_123) 覆盖在 Body 区域上方。
        - 当路由切回 `/dashboard`: 隐藏/移除所有 WhatsApp `BrowserView`，露出底层的 Vben 页面。

## 3. 通信与监控 (Inter-Process Communication)
Admin UI 需要监控和控制 Tab。

*   **控制 (Admin -> Tab)**: 
    - Admin 点击 "打开账号 123" -> IPC `wa:open(123)` -> Main Process 创建/显示 View。
    - Admin 点击 "关闭所有" -> IPC `wa:closeAll()` -> Main Process 销毁 Views。
*   **监控 (Tab -> Admin)**:
    - WhatsApp View 收到新消息/掉线 -> IPC `wa:status(123, 'offline')` -> Main Process 转发 -> Admin Store 更新状态 -> UI 变红报警。

## 4. 目录结构 (保持不变)
```
desktop/
├── electron/
│   ├── main/services/ViewService.ts  # [核心] 负责 BrowserView 的坐标同步与层级管理
│   ├── main/services/WhatsAppService.ts # [核心] 负责 Session/Partition配置
│   └── ...
├── apps/web/src/
│   ├── layouts/default/header/       # [改造] 集成 Window Controls 和 Tabs
│   └── views/whatsapp/placeholder.vue # [新] 占位组件
```
