# 001. 总体架构与战略规划 (Overview)

## 1. 项目背景与目标

本项目旨在构建一个企业级的 **WhatsApp 多账号管理系统 (WPP)**。
我们需要将原本基于 `electron-vite` 的 `desktop_old` 原型，迁移至更成熟、UI 更精美的 **Vben Admin v5 (Electron 版)** 架构上。

**核心目标**：
1.  **极致的 UI/UX**：利用 Vben Admin v5 提供的现代化后台管理界面。
2.  **严格的账号隔离**：实现单机运行 10+ 个 WhatsApp 账号，每个账号拥有独立的 Cookie、Local Storage、IndexDB 和 **独立代理 IP**，互不关联。
3.  **混合渲染架构**：UI 层使用 Vue3 (Vben)，业务层 (WhatsApp 网页) 使用 Electron 的 `WebContentsView` (BrowserView) 进行原生挂载。

---

## 2. 核心架构设计

我们采用 **"Chrome 浏览器模式"** 的混合架构。

### 2.1 界面形态 (UI/UX)
为了满足 "Admin UI + 多 Tabs 切换" 及 "窗口控制集成" 的需求，我们将深度定制 Vben 的布局：

*   **无边框窗口 (Frameless Window)**：隐藏系统原生标题栏。
*   **全局标签栏 (Top Tab Bar)**：
    *   利用 Vben 的 **Multi-Tab** 功能作为核心导航。
    *   **Tab 1 (固定)**: Admin Dashboard (管理后台，用于监控、启动其他账号)。
    *   **Tab N**: WhatsApp 独立会话页面 (路由 `/whatsapp/:id`)。
    *   **窗口控制区**: 在标签栏右侧集成 "最小化 / 最大化 / 关闭" 按钮。
*   **交互逻辑**:
    *   用户在 Admin 页点击 "启动账号 A" -> Vben 推送路由 `/whatsapp/account_a` -> 顶部出现新标签 -> 主进程挂载 WA 视图。
    *   切换标签 -> 主进程自动切换显示的 View。
    *   关闭标签 -> 主进程 detach 视图 (可选择是否后台保持运行)。

### 2.2 架构图解

```mermaid
graph TD
    subgraph "Main Process (主进程 - Node.js)"
        MainEntry[Main Entry (main.ts)]
        ViewManager[BrowserView Manager]
        AccountMgr[Account Manager]
        EventBus[Event Service]
        
        subgraph "Session Factory"
            Session1[Session: persist:wa_user_001]
            Session2[Session: persist:wa_user_002]
            Proxy1[Proxy Config 1]
            Proxy2[Proxy Config 2]
        end
    end

    subgraph "Renderer Process (渲染进程 - Vben Admin)"
        VbenApp[Vben Vue App]
        Router[Vue Router]
        Store[Pinia Store]
        Placeholder[div #whatsapp-container]
    end

    subgraph "Native Views (原生视图层)"
        WA1[WebContentsView (WA User 1)]
        WA2[WebContentsView (WA User 2)]
    end

    %% 连接关系
    MainEntry --> ViewManager
    ViewManager --> WA1
    ViewManager --> WA2
    
    Session1 --> WA1
    Session2 --> WA2
    Proxy1 -.-> Session1
    Proxy2 -.-> Session2

    VbenApp -- IPC: Switch/Resize --> MainEntry
    MainEntry -- IPC: Status Update --> VbenApp
    
    Placeholder -.->|坐标映射| WA1
```

### 2.2 职责划分

| 组件 | 职责 | 关键技术 |
| :--- | :--- | :--- |
| **Vben Admin (Renderer)** | 1. 应用壳子 (Shell)<br>2. 账号列表管理、配置界面<br>3. **视图控制器** (告诉主进程哪里显示 WA)<br>4. 接收并展示消息通知 | Vue 3, Pinia, Vue Router, IPC Renderer |
| **Main Process** | 1. **视图工厂**：创建和管理 WebContentsView<br>2. **会话管理**：配置 Partition 和 Proxy<br>3. **注入脚本**：向 WA 注入 `wapi.js`<br>4. **API 桥接**：处理 WA 内部事件并转发给 UI | Electron, Node.js, SQLite/JSON |
| **WhatsApp View** | 1. 运行 WhatsApp Web 官方代码<br>2. 运行注入的 `preload.js` 和 `wa-js` | WhatsApp Web, Preload Script |

---

## 3. 为什么选择 Vben Admin Electron v5？

1.  **工程化完备**：v5 版本基于 Monorepo (Turbo + PNPM)，解决了 Electron 在多包管理下的构建痛点。
2.  **Electron 集成**：内置 `vite-plugin-electron`，主进程支持 HMR (热重载)，开发体验远超手搓。
3.  **UI 组件库**：现成的 Shadcn/AntDesign 封装，能快速构建高质量的“账号管理”、“代理配置”、“系统设置”页面，无需从零写 CSS。

---

## 4. 迁移策略 (三步走)

### 第一阶段：基础设施搭建 (Foundation)
*   清理 Vben 演示代码，保留核心框架。
*   建立主进程目录结构 (`apps/electron-main`)。
*   配置 TypeScript 路径别名，确保主进程能引用共享类型。

### 第二阶段：核心内核迁移 (Core Porting)
*   移植 `desktop_old` 的 `BrowserViewManager` -> 适配 Electron 39 的 `WebContentsView`。
*   实现 **隔离工厂**：编写能够根据 ID 生成独立 Partition 和 Proxy 的逻辑。
*   移植 `wppconnect` 注入逻辑。

### 第三阶段：UI 对接 (UI Integration)
*   创建 `/whatsapp/:id` 路由与占位组件。
*   实现 `useViewRect` 钩子，实时同步 DOM 位置给主进程。
*   对接 Pinia Store，实现账号状态（登录/离线/新消息）的实时响应。

---

## 5. 目录结构规划

```
desktop/                 # [Project Root] 新项目根目录
├── apps/
│   ├── web-antd/            # [UI] Vben 主应用 (原 web-antd)
│   │   ├── src/views/whatsapp/  # 新增：WhatsApp 占位页面
│   │   └── ...
│   └── electron-main/       # [Main] 新增：独立的主进程包 (替代 playground/electron)
│       ├── src/
│       │   ├── main.ts      # 入口
│       │   ├── managers/    # 移植 ViewManager, AccountManager
│       │   ├── services/    # 移植 EventService
│       │   └── preload/     # Preload 脚本
│       ├── package.json
│       └── tsconfig.json
├── internal/
│   └── vite-config/         # 构建配置 (需微调以支持新的 electron-main 路径)
└── package.json
```

**下一步**：请阅读 `gemini-002-foundation-setup.md` 开始环境搭建。
