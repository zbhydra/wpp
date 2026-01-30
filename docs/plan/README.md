# WPP Manager 重构计划（修订版）

## 文档版本

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 2.0 | 2026-01-30 | 重构版本，不考虑兼容性 |

---

## 核心变化

### 与原计划的区别

| 维度 | 原计划（迁移） | 新计划（重构） |
|------|---------------|---------------|
| **目标** | 保留兼容，渐进式 | 实现功能，架构最优 |
| **代码复用** | 最大化复用 | 仅复用核心逻辑 |
| **架构设计** | 受旧代码约束 | 重新设计 |
| **数据格式** | 保持兼容 | 可重新设计 |
| **时间估算** | 12 周 | 8-10 周 |

---

## 重构的核心改进

### 1. 架构简化

**原架构（desktop_old）：**
```
Renderer → IPC → EventService → ViewManager → WhatsAppView
                  ↑
             复杂的事件转发
```

**新架构：**
```
Renderer → IPC → 直接调用
              ↓
         WhatsAppController
              ↓
         WhatsAppView
```

**简化点：**
- 移除 EventService 中间层
- 使用直接的方法调用
- 事件订阅更简单

---

### 2. 代码组织优化

**原结构（desktop_old）：**
```
desktop_old/src/
├── main/
│   ├── main.ts                 # 入口 + 窗口创建混在一起
│   ├── BrowserViewManager.ts   # 700 行，职责过多
│   ├── whatsapp/               # WhatsApp 相关
│   ├── ipc/                    # IPC 处理
│   └── services/               # 服务
└── renderer/                   # Vue 代码，无清晰分层
```

**新结构：**
```
desktop/src/
├── packages/
│   ├── main/                   # 主进程包
│   │   ├── core/               # 核心基础设施
│   │   ├── window/             # 窗口管理
│   │   ├── whatsapp/           # WhatsApp 业务
│   │   └── controllers/        # 控制器层（新增）
│   │
│   ├── preload/                # Preload 包
│   │   ├── main/               # Admin View preload
│   │   └── whatsapp/           # WhatsApp preload
│   │
│   ├── renderer/               # 渲染进程包（Vben Admin）
│   │   ├── pages/              # 页面
│   │   ├── stores/             # 状态管理
│   │   ├── components/         # 组件
│   │   └── api/                # API 层
│   │
│   └── shared/                 # 共享包
│       ├── types/              # 类型定义
│       ├── constants/          # 常量
│       └── utils/              # 工具函数
│
├── resources/                  # 资源文件
│   └── wa-js/                  # WA-JS 文件
│
├── electron.vite.config.ts
└── package.json
```

**改进点：**
- 清晰的包边界
- 单一职责原则
- 更易于测试

---

### 3. 控制器模式（新增）

**问题：** desktop_old 的 IPC handlers 直接调用 Manager，逻辑分散

**解决方案：** 引入控制器层

```typescript
// packages/main/controllers/whatsapp.controller.ts
class WhatsAppController {
  constructor(
    private accountManager: WhatsAppAccountManager,
    private messageManager: WhatsAppMessageManager,
  ) {}

  async getAccounts(): Promise<WhatsAppAccount[]> {
    return this.accountManager.getAll();
  }

  async startAccount(id: string): Promise<void> {
    await this.accountManager.start(id);
  }

  async sendMessage(accountId: string, to: string, message: string): Promise<void> {
    await this.messageManager.send(accountId, to, message);
  }
}

// IPC handlers 变得非常简单
ipcMain.handle('whatsapp:getAccounts', () => controller.getAccounts());
ipcMain.handle('whatsapp:startAccount', (_, id) => controller.startAccount(id));
```

---

### 4. 状态管理统一

**问题：** desktop_old 状态分散在多处

**解决方案：** 统一使用 Pinia + 共享类型

```typescript
// packages/shared/types/whatsapp.ts
export interface WhatsAppAccount {
  id: string;
  name: string;
  status: AccountStatus;
  // ...
}

// packages/renderer/stores/whatsapp.ts
export const useWhatsAppStore = defineStore('whatsapp', () => {
  const accounts = ref<WhatsAppAccount[]>([]);

  // 直接通过 Electron API 获取
  async function fetchAccounts() {
    accounts.value = await electronAPI.whatsapp.getAccounts();
  }

  // 监听状态变化
  function setupListeners() {
    electronAPI.whatsapp.onAccountsUpdate((updated) => {
      accounts.value = updated;
    });
  }

  return { accounts, fetchAccounts, setupListeners };
});
```

---

### 5. 错误处理统一

**问题：** desktop_old 错误处理分散

**解决方案：** 统一的错误处理

```typescript
// packages/shared/errors/index.ts
export class WhatsAppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class AccountNotFoundError extends WhatsAppError {
  constructor(accountId: string) {
    super(`Account ${accountId} not found`, 'ACCOUNT_NOT_FOUND', { accountId });
  }
}

// 统一错误处理中间件
async function handleIPCError<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

// IPC handler 使用
ipcMain.handle('whatsapp:startAccount', async (_, id) => {
  return handleIPCError(() => controller.startAccount(id));
});
```

---

### 6. 类型系统增强

**问题：** desktop_old 很多 any 类型

**解决方案：** 完整的类型定义

```typescript
// packages/shared/types/index.ts
export * from './whatsapp';
export * from './message';
export * from './contact';
export * from './ipc';

// 严格的 IPC 类型
export type IPCInvokeHandler<T extends keyof IPCInvokeMap> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<IPCInvokeMap[T]>
) => ReturnType<IPCInvokeMap[T]>;

export type IPCSendHandler<T extends keyof IPCSendMap> = (
  event: IpcMainEvent,
  ...args: Parameters<IPCSendMap[T]>
) => void;
```

---

### 7. 依赖注入

**问题：** desktop_old 模块间耦合严重

**解决方案：** 依赖注入容器

```typescript
// packages/main/core/di.ts
class DIContainer {
  private services = new Map<string, any>();

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory());
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) throw new Error(`Service ${key} not found`);
    return service;
  }
}

// 使用
const container = new DIContainer();
container.register('accountManager', () => new WhatsAppAccountManager());
container.register('whatsappController', () => new WhatsAppController(
  container.resolve('accountManager')
));
```

---

## 功能清单（来自 desktop_old）

### 核心功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **账号管理** | 创建/删除/重命名账号 | P0 |
| **账号生命周期** | 启动/停止账号，状态管理 | P0 |
| **二维码登录** | 扫码登录 WhatsApp | P0 |
| **标签页管理** | 多标签页切换 | P0 |
| **消息发送** | 发送文本/文件消息 | P0 |
| **消息接收** | 接收并显示消息 | P0 |
| **联系人管理** | 查看联系人列表 | P1 |
| **消息历史** | 查看历史消息 | P1 |
| **用户认证** | 登录/注册 | P1 |
| **权限控制** | 角色和权限 | P2 |

---

## 重构后的架构优势

| 方面 | 改进 |
|------|------|
| **可维护性** | 清晰的模块边界，单一职责 |
| **可测试性** | 依赖注入，控制器模式 |
| **可扩展性** | 松耦合设计 |
| **类型安全** | 完整的 TypeScript 类型 |
| **错误处理** | 统一的错误处理机制 |
| **状态管理** | Pinia 统一管理 |
| **代码质量** | 更少的代码行数，更清晰的结构 |

---

## 下一步

确认此重构方向后，我将：

1. **创建详细的重构计划文档**（替代之前的迁移计划）
2. **设计新的目录结构**
3. **定义核心接口和类型**
4. **开始 Phase 1: 项目初始化**

---

## 相关文档

- [原计划 - 001. 项目概述](./claude-glm-001-overview.md)（已过时）
- [原计划 - 002. 技术架构](./claude-glm-002-architecture.md)（部分参考）
- [待创建 - 重构架构设计](./claude-glm-reborn-001-architecture.md)
- [待创建 - 重构实施计划](./claude-glm-reborn-002-implementation.md)
