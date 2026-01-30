# 系统架构设计

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 1.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity Claude Opus 4.5 |
| 目的 | desktop 新架构的系统设计图和数据流说明 |

---

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              desktop 应用架构                                     │
│                         (Electron 39 + Vue 3.5.27)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           Main Process                                   │    │
│  │                                                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                       Window Layer                               │    │    │
│  │  │   MainWindow │ BrowserViewManager │ TabBarView                  │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                     WhatsApp Core                                │    │    │
│  │  │   WhatsAppAccountManager │ WhatsAppBrowserView │ SessionManager │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                     Services                                     │    │    │
│  │  │   EventService │ StoreService │ Logger                          │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                         │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                     IPC Handlers                                 │    │    │
│  │  │   AccountHandlers │ MessageHandlers │ WindowHandlers            │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      │ IPC (contextBridge)                      │
│                                      │                                          │
│  ┌───────────────────────────────────┴──────────────────────────────────────┐   │
│  │                          Renderer Processes                              │   │
│  │                                                                          │   │
│  │  ┌────────────────────┐  ┌─────────────────────────────────────────────┐ │   │
│  │  │     TabBar View    │  │               Admin View                    │ │   │
│  │  │    (Inline HTML)   │  │           (Vue 3 + Ant Design)             │ │   │
│  │  │                    │  │                                             │ │   │
│  │  │  • Tab 切换        │  │  ┌─────────────────────────────────────┐   │ │   │
│  │  │  • Tab 关闭        │  │  │         Vben Admin Features         │   │ │   │
│  │  │  • 窗口控制        │  │  │  • Vue Router                       │   │ │   │
│  │  │  • 拖拽排序        │  │  │  • Pinia                            │   │ │   │
│  │  │                    │  │  │  • Ant Design Vue                   │   │ │   │
│  │  └────────────────────┘  │  │  • I18n                             │   │ │   │
│  │                          │  └─────────────────────────────────────┘   │ │   │
│  │                          │                                             │ │   │
│  │                          │  ┌─────────────────────────────────────┐   │ │   │
│  │                          │  │           Pages                      │   │ │   │
│  │                          │  │  • Dashboard                         │   │ │   │
│  │                          │  │  • AccountManager                    │   │ │   │
│  │                          │  │  • MessageCenter                     │   │ │   │
│  │                          │  │  • Settings                          │   │ │   │
│  │                          │  └─────────────────────────────────────┘   │ │   │
│  │                          └─────────────────────────────────────────────┘ │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │   │
│  │  │                     WhatsApp Views (独立 Partition)                 │ │   │
│  │  │                                                                     │ │   │
│  │  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │ │   │
│  │  │  │ WA View 1     │  │ WA View 2     │  │ WA View N     │           │ │   │
│  │  │  │               │  │               │  │               │           │ │   │
│  │  │  │ partition:    │  │ partition:    │  │ partition:    │           │ │   │
│  │  │  │ persist:wa-1  │  │ persist:wa-2  │  │ persist:wa-N  │           │ │   │
│  │  │  │               │  │               │  │               │           │ │   │
│  │  │  │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │           │ │   │
│  │  │  │ │ WhatsApp  │ │  │ │ WhatsApp  │ │  │ │ WhatsApp  │ │           │ │   │
│  │  │  │ │ Web       │ │  │ │ Web       │ │  │ │ Web       │ │           │ │   │
│  │  │  │ │ + WA-JS   │ │  │ │ + WA-JS   │ │  │ │ + WA-JS   │ │           │ │   │
│  │  │  │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │           │ │   │
│  │  │  └───────────────┘  └───────────────┘  └───────────────┘           │ │   │
│  │  └─────────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ HTTP API
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Backend Server (FastAPI)                            │
│                              (现有服务，无需修改)                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 进程通信架构

```
                    ┌─────────────────────────────────────┐
                    │           Main Process              │
                    │                                     │
                    │  ┌───────────────────────────────┐  │
                    │  │        EventService          │  │
                    │  │    (中央事件总线/消息转发)     │  │
                    │  └───────────────────────────────┘  │
                    │              │                      │
                    │     ┌────────┼────────┐             │
                    │     │        │        │             │
                    │     ▼        ▼        ▼             │
                    │  ┌─────┐ ┌─────┐ ┌─────────┐        │
                    │  │ IPC │ │ IPC │ │   IPC   │        │
                    │  │ WA  │ │Admin│ │  Tab    │        │
                    └──┴──┬──┴─┴──┬──┴─┴────┬────┴────────┘
                          │       │         │
         ┌────────────────┼───────┼─────────┼───────────────────┐
         │                │       │         │                   │
         ▼                ▼       ▼         ▼                   │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     │
│   WhatsApp      │ │   Admin View    │ │   TabBar View   │     │
│   Views (N个)   │ │   (Vue 3)       │ │   (HTML)        │     │
│                 │ │                 │ │                 │     │
│  whatsapp_      │ │  whatsapp:      │ │  tab:           │     │
│  window:*       │ │  accounts:*     │ │  created/       │     │
│  channels       │ │  message:*      │ │  closed/        │     │
│                 │ │  channels       │ │  switched       │     │
└─────────────────┘ └─────────────────┘ └─────────────────┘     │
                                                                │
```

---

## 3. IPC 通道一览

### 3.1 账号管理通道

```
Renderer → Main (invoke):
├── whatsapp:getAccounts      →  获取所有账号列表
├── whatsapp:createAccount    →  创建新账号
├── whatsapp:deleteAccount    →  删除账号
├── whatsapp:startAccount     →  启动账号
├── whatsapp:stopAccount      →  停止账号
└── whatsapp:renameAccount    →  重命名账号

Main → Renderer (send):
├── whatsapp:accounts:update  →  账号列表变化
└── whatsapp:account:status   →  单账号状态变化
```

### 3.2 消息通道

```
Renderer → Main (invoke):
├── whatsapp:sendMessage      →  发送消息
├── whatsapp:getChats         →  获取聊天列表
└── whatsapp:getContacts      →  获取联系人

Main → Renderer (send):
├── whatsapp:message:received →  收到新消息
└── whatsapp:message:sent     →  消息发送成功
```

### 3.3 WhatsApp View 通道

```
WhatsApp View → Main (send):
├── whatsapp_window:ready:{id}           →  WA-JS 就绪
├── whatsapp_window:login:{id}           →  登录成功
├── whatsapp_window:logout:{id}          →  登出
├── whatsapp_window:user_info:{id}       →  用户信息
├── whatsapp_window:message_received:{id}→  收到消息
├── whatsapp_window:message_sent:{id}    →  发送成功
└── whatsapp_window:error:{id}           →  错误

Main → WhatsApp View (send):
└── whatsapp_window:command:{id}         →  执行命令
```

### 3.4 标签页通道

```
Any → TabBar (send):
├── tab:created   →  新标签创建
├── tab:closed    →  标签关闭
└── tab:switched  →  标签切换

TabBar → Main (send):
├── tab:switch    →  请求切换
├── tab:close     →  请求关闭
└── tab:reorder   →  请求重排序
```

---

## 4. 数据流图

### 4.1 启动账号流程

```
┌───────────┐     ┌───────────┐     ┌─────────────────────┐     ┌────────────┐
│  用户点击  │────▶│  Renderer │────▶│    Main Process     │────▶│ WhatsApp   │
│  启动按钮  │     │  invoke   │     │                     │     │ View       │
└───────────┘     │ startAcc- │     │ 1. 检查账号存在     │     │            │
                  │ ount      │     │ 2. 更新状态Starting │     │            │
                  └───────────┘     │ 3. 注册回调         │     │            │
                                    │ 4. 创建 WA View     │────▶│ 创建视图   │
                                    │ 5. 添加到 Manager   │     │            │
                                    │ 6. 加载 WA Web      │────▶│ loadURL    │
                                    │ 7. 通知 TabBar      │     │            │
                                    │ 8. 更新状态 QR      │     │            │
                                    └─────────────────────┘     └────────────┘
                                             │                        │
                                             │  accounts:update       │
                                             ▼                        │
                                    ┌───────────────┐                 │
                                    │   Renderer    │                 │
                                    │   更新 UI     │                 │
                                    └───────────────┘                 │
                                                                      │
                                                                      │ WA-JS 注入
                                                                      │ 扫码登录
                                                                      ▼
                                    ┌─────────────────────┐     ┌────────────┐
                                    │    Main Process     │◀────│ login 事件 │
                                    │                     │     │            │
                                    │ 更新状态 LoggedIn   │     └────────────┘
                                    │                     │
                                    └─────────────────────┘
                                             │
                                             │ accounts:update
                                             ▼
                                    ┌───────────────┐
                                    │   Renderer    │
                                    │ 显示已登录状态 │
                                    └───────────────┘
```

### 4.2 消息发送流程

```
┌───────────┐     ┌───────────┐     ┌─────────────────────┐
│  用户输入  │────▶│  Renderer │────▶│    Main Process     │
│  发送消息  │     │  invoke   │     │                     │
└───────────┘     │ sendMsg   │     │ forwardToWAView()   │
                  └───────────┘     └────────────┬────────┘
                                                 │
                                                 │ command
                                                 ▼
                                    ┌────────────────────┐
                                    │   WhatsApp View    │
                                    │                    │
                                    │ WPP.chat.send      │
                                    │ TextMessage()      │
                                    │                    │
                                    └────────────┬───────┘
                                                 │
                                                 │ message_sent
                                                 ▼
                                    ┌─────────────────────┐
                                    │    Main Process     │
                                    │                     │
                                    │ forward to Renderer │
                                    └────────────┬────────┘
                                                 │
                                                 │ message:sent
                                                 ▼
                                    ┌───────────────┐
                                    │   Renderer    │
                                    │ 更新消息列表  │
                                    └───────────────┘
```

### 4.3 接收消息流程

```
                                    ┌────────────────────┐
                                    │   WhatsApp View    │
                                    │                    │
              WhatsApp 服务器 ─────▶│ WPP.on('chat.     │
              推送新消息            │ new_message')      │
                                    │                    │
                                    └────────────┬───────┘
                                                 │
                                                 │ message_received
                                                 ▼
                                    ┌─────────────────────┐
                                    │    Main Process     │
                                    │                     │
                                    │ 1. 回调处理         │
                                    │ 2. 保存消息历史     │
                                    │ 3. 转发到 Renderer  │
                                    └────────────┬────────┘
                                                 │
                                                 │ message:received
                                                 ▼
                                    ┌───────────────┐
                                    │   Renderer    │
                                    │               │
                                    │ 1. 更新 Store │
                                    │ 2. 显示通知   │
                                    │ 3. 更新 UI    │
                                    └───────────────┘
```

---

## 5. 视图布局设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Main Window                                     │
│                              (无边框窗口)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                            TabBar (40px)                                 │ │
│ │  [管理后台][账号1][账号2][账号3]...                    [─][□][×]        │ │
│ │                                                                         │ │
│ │  • 固定顶部                                                              │ │
│ │  • 支持拖拽 (-webkit-app-region: drag)                                  │ │
│ │  • 标签区域可交互 (-webkit-app-region: no-drag)                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                         │ │
│ │                         Content Area                                    │ │
│ │                    (高度 = 窗口高度 - 40px)                              │ │
│ │                                                                         │ │
│ │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│ │  │                    Active View                                  │   │ │
│ │  │                                                                 │   │ │
│ │  │   • Admin View (Vben Admin)                                    │   │ │
│ │  │     OR                                                         │   │ │
│ │  │   • WhatsApp View (WhatsApp Web)                               │   │ │
│ │  │                                                                 │   │ │
│ │  │   一次只显示一个视图，其他视图隐藏                               │   │ │
│ │  │                                                                 │   │ │
│ │  └─────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 会话隔离机制

```
                    ┌─────────────────────────────────────┐
                    │           Session Store             │
                    │                                     │
                    │  sessions/                          │
                    │  ├── sessions.json    (元数据)      │
                    │  └── tokens/                        │
                    │      ├── account_1.json             │
                    │      ├── account_2.json             │
                    │      └── account_N.json             │
                    └─────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │        Electron Partitions          │
                    │                                     │
                    │  persist:wa-account_1               │
                    │  ├── cookies                        │
                    │  ├── localStorage                    │
                    │  └── sessionStorage                  │
                    │                                     │
                    │  persist:wa-account_2               │
                    │  ├── cookies                        │
                    │  ├── localStorage                    │
                    │  └── sessionStorage                  │
                    │                                     │
                    │  persist:wa-account_N               │
                    │  ├── ...                            │
                    │  └── ...                            │
                    └─────────────────────────────────────┘
```

---

## 7. 安全架构

### 7.1 进程隔离

| 进程 | nodeIntegration | contextIsolation | sandbox |
|------|-----------------|------------------|---------|
| Main Process | N/A (Node.js) | N/A | N/A |
| Admin Renderer | false | true | true |
| WhatsApp Renderers | false | true | true |

### 7.2 IPC 安全

```typescript
// ✅ 安全: 使用 contextBridge
contextBridge.exposeInMainWorld('api', {
  sendMessage: (msg) => ipcRenderer.invoke('sendMessage', msg)
});

// ❌ 不安全: 直接暴露 ipcRenderer
// contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
```

### 7.3 CSP 处理

```typescript
// 修改 WhatsApp CSP 以允许 WA-JS 注入
session.webRequest.onHeadersReceived(
  { urls: ['https://web.whatsapp.com/*'] },
  (details, callback) => {
    // 修改 CSP 允许 unsafe-inline 和 unsafe-eval
    callback({ responseHeaders: modifiedHeaders });
  }
);
```

---

## 8. 相关文档

- [001. 分支对比分析](./antigravity-claudeOpus4.5-001-vben-comparison.md)
- [002. 迁移策略](./antigravity-claudeOpus4.5-002-migration-strategy.md)
- [003. 实现细节](./antigravity-claudeOpus4.5-003-implementation-details.md)
