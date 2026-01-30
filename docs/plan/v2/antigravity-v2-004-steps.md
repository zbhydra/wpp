# 分步执行计划

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | 2.0 |
| 创建日期 | 2026-01-30 |
| 作者 | Antigravity |
| 目的 | 定义可测试的分步执行计划 |

---

## 执行原则

> [!IMPORTANT]
> **每一步都是可测试的，完成一步再继续下一步。**

---

## Step 1: 项目初始化

### 1.1 目标
在 `wpp/desktop` 目录初始化 Electron + Vue 3 项目。

> [!NOTE]
> **项目结构说明**
> ```
> wpp/
> ├── admin/           # 独立的 Web 管理后台
> ├── desktop/         # 桌面应用（本项目）
> ├── server/          # 后端服务
> └── vue-vben-admin-main/  # Vben Admin（参考/复制包）
> ```

### 1.2 执行步骤

```bash
# 1. 进入 desktop 目录
cd /Users/lxl/Documents/ljr/project/wpp/desktop

# 2. 使用 electron-vite 模板初始化
# 或手动初始化
pnpm init

# 3. 安装基础依赖
pnpm add -D electron electron-vite electron-builder typescript vite @vitejs/plugin-vue
pnpm add vue vue-router pinia
```

### 1.3 验证标准

- [x] `desktop/package.json` 存在
- [x] 可以运行 `pnpm install` 无报错

---

## Step 2: 创建项目配置文件

### 2.1 目标
创建 electron-vite 和 TypeScript 配置文件。

### 2.2 需要创建的文件

```
desktop/
├── package.json           # 添加 scripts
├── tsconfig.json          # TypeScript 主配置
├── tsconfig.main.json     # Main process 配置
├── tsconfig.preload.json  # Preload 配置
├── tsconfig.renderer.json # Renderer 配置
├── electron.vite.config.ts # electron-vite 配置
└── electron-builder.yml   # 打包配置
```

### 2.3 验证标准

- [x] TypeScript 编译无错误
- [x] `pnpm run dev` 可以启动（空窗口也算成功）

---

## Step 3: 创建 Main Process 骨架

### 3.1 目标
创建能够启动的最小主进程。

### 3.2 需要创建的文件

```
desktop/src/main/
├── index.ts               # 入口
└── window/
    └── main-window.ts     # 主窗口
```

### 3.3 验证标准

### 3.3 验证标准

- [x] 启动应用显示空白窗口
- [x] 窗口无边框 (frameless)
- [x] 窗口可拖动、可调整大小

---

## Step 4: 创建 Admin Preload

### 4.1 目标
创建 Admin UI 的 preload 脚本。

### 4.2 需要创建的文件

```
desktop/src/preload/
└── admin.ts
```

### 4.3 验证标准

- [x] `window.electronAPI` 在渲染进程可访问
- [x] 窗口控制 API 可用 (minimize/maximize/close)

---

## Step 5: 创建 Renderer 骨架

### 5.1 目标
创建可显示的 Vue 3 渲染进程。

### 5.2 需要创建的文件

```
desktop/src/renderer/
├── index.html
└── src/
    ├── main.ts
    ├── App.vue
    └── styles/
        └── index.css
```

### 5.3 验证标准

- [x] 启动后显示 "Hello Desktop" 页面
- [x] Vue DevTools 可工作
- [x] 热重载工作正常

---

## Step 6: 集成 Vben Admin

### 6.1 目标
集成 @vben/* 核心包到渲染进程。

### 6.2 说明

由于 desktop 是独立项目（不在 vue-vben-admin-main monorepo 内），需要：

**方案 A：复制所需的 @vben/* 包**
```bash
# 从 vue-vben-admin-main 复制需要的包
cp -r ../vue-vben-admin-main/packages/@core ./packages/
```

**方案 B：发布到私有 npm 或使用 git submodule**

### 6.3 验证标准

- [ ] Vben Admin 布局正常显示
- [ ] 侧边栏/顶栏可见
- [ ] 主题切换功能正常

---

## Step 7: 创建 Tab Bar

### 7.1 目标
创建顶部标签栏视图。

### 7.2 需要创建的文件

```
desktop/src/main/window/
├── view-manager.ts
└── tab-bar.ts
```

### 7.3 验证标准

- [ ] 标签栏固定在顶部 (40px 高度)
- [ ] 显示 "管理后台" 标签
- [ ] 窗口控制按钮可用 (─ □ ×)
- [ ] 点击最小化/最大化/关闭工作正常

---

## Step 8: 创建 Tab Manager

### 8.1 目标
实现 Tab 的创建和管理逻辑。

### 8.2 需要创建的文件

```
desktop/src/main/tabs/
├── tab-manager.ts
├── tab-session.ts
└── tab-view.ts
```

### 8.3 验证标准

- [ ] 可以通过 IPC 创建新 Tab
- [ ] 新 Tab 显示在标签栏
- [ ] 点击 Tab 可切换视图

---

## Step 9: 实现 Session 隔离

### 9.1 目标
每个 Tab 使用独立的 session partition。

### 9.2 验证标准

- [ ] 创建 Tab A，加载 example.com，设置 cookie
- [ ] 创建 Tab B，加载 example.com，无 cookie
- [ ] 两个 Tab 的 localStorage 相互独立

---

## Step 10: 实现 Tab 持久化

### 10.1 目标
关闭应用后再打开，Tab 状态保持。

### 10.2 需要创建/更新的文件

```
desktop/src/main/services/
└── store-service.ts
```

### 10.3 验证标准

- [ ] 创建 Tab，登录某网站
- [ ] 关闭应用，重新打开
- [ ] 该 Tab 仍保持登录状态

---

## Step 11: 创建 Admin UI 页面

### 11.1 目标
创建管理后台的业务页面。

### 11.2 需要创建的文件

```
desktop/src/renderer/src/views/
├── dashboard/
│   └── index.vue
├── tabs/
│   └── tab-manager.vue
└── settings/
    └── index.vue
```

### 11.3 验证标准

- [ ] Dashboard 页面显示 Tab 统计
- [ ] Tab Manager 页面可创建/删除 Tab
- [ ] Settings 页面可配置代理

---

## Step 12: 实现代理配置

### 12.1 目标
支持为每个 Tab 配置独立代理。

### 12.2 更新文件

```
desktop/src/main/tabs/
└── tab-proxy.ts
```

### 12.3 验证标准

- [ ] 创建 Tab 时可指定代理
- [ ] 访问 ip 检测网站显示代理 IP
- [ ] 不同 Tab 可使用不同代理

---

## Step 13: WhatsApp 专用 Preload（可选）

### 13.1 目标
为 WhatsApp 网站创建专用 preload。

### 13.2 需要创建的文件

```
desktop/src/preload/tab/whatsapp/
├── wa-js-injector.ts
└── event-listener.ts
```

### 13.3 验证标准

- [ ] 加载 web.whatsapp.com 无报错
- [ ] WA-JS 注入成功
- [ ] 可发送/接收消息

---

## Step 14: 构建与打包

### 14.1 目标
生成可分发的安装包。

### 14.2 执行步骤

```bash
# 开发构建
pnpm run build

# Mac 打包
pnpm run build:mac

# Windows 打包
pnpm run build:win
```

### 14.3 验证标准

- [ ] 生成 .dmg (Mac)
- [ ] 生成 .exe (Windows)
- [ ] 安装后可正常运行

---

## 进度跟踪

| Step | 名称 | 状态 |
|------|------|------|
| 1 | 项目初始化 | [x] |
| 2 | 创建项目配置文件 | [x] |
| 3 | 创建 Main Process 骨架 | [x] |
| 4 | 创建 Admin Preload | [x] |
| 5 | 创建 Renderer 骨架 | [x] |
| 6 | 集成 Vben Admin | [ ] |
| 7 | 创建 Tab Bar | [ ] |
| 8 | 创建 Tab Manager | [ ] |
| 9 | 实现 Session 隔离 | [ ] |
| 10 | 实现 Tab 持久化 | [ ] |
| 11 | 创建 Admin UI 页面 | [ ] |
| 12 | 实现代理配置 | [ ] |
| 13 | WhatsApp 专用 Preload | [ ] |
| 14 | 构建与打包 | [ ] |

---

## 相关文档

- [001. 核心需求](./antigravity-v2-001-requirements.md)
- [002. 架构设计](./antigravity-v2-002-architecture.md)
- [003. 实现细节](./antigravity-v2-003-implementation.md)
