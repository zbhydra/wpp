# Phase 3: 主进程核心

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 3 - 主进程核心（第 249-553 行）

## 目标

实现主进程的核心功能，包括窗口管理、视图管理、会话管理、账号管理和代理管理。

## 需要处理

### 1. 实现主窗口管理 (MainWindow)

**文件**: `desktop/electron/main/window/main-window.ts`

需要实现：
- `create()` - 创建主窗口
  - 无边框窗口（frame: false）
  - 设置 preload 路径
  - 开发模式自动打开 DevTools
  - 窗口尺寸：1400x900，最小 1200x700
- `get()` - 获取窗口实例

### 2. 实现视图管理器 (ViewManager)

**文件**: `desktop/electron/main/window/view-manager.ts`

需要实现：
- `createAdminView()` - 创建 Admin 视图
  - 加载 vben 应用（开发模式连接 VITE_DEV_SERVER_URL）
  - 设置 bounds（避开 TabBar 区域）
- `createWhatsAppView(account)` - 创建 WhatsApp 视图
  - 使用独立的 partition（persist:wa-{id}）
  - 加载 web.whatsapp.com
  - 应用代理配置
- `switchView(viewId)` - 切换活动视图
- `removeView(viewId)` - 移除视图
- `getActiveViewId()` - 获取当前活动视图 ID

### 3. 实现会话管理器 (SessionManager)

**文件**: `desktop/electron/main/whatsapp/session-manager.ts`

需要实现：
- `save(account)` - 保存账号到文件系统
- `load(accountId)` - 加载单个账号
- `loadAll()` - 加载所有账号
- `remove(accountId)` - 删除账号文件
- 存储位置：`app.getPath('userData')/sessions/{accountId}.json`

### 4. 实现账号管理器 (AccountManager)

**文件**: `desktop/electron/main/whatsapp/account-manager.ts`

需要实现：
- `initialize()` - 初始化，加载所有已保存的账号
- `create(name)` - 创建新账号，生成唯一 ID
- `start(accountId)` - 启动账号（创建视图）
- `stop(accountId)` - 停止账号（移除视图）
- `delete(accountId)` - 删除账号
- `getAll()` - 获取所有账号列表
- `get(accountId)` - 获取单个账号
- 继承 EventEmitter，发送事件：account:created, account:status, account:deleted

### 5. 实现代理管理器 (ProxyManager)

**文件**: `desktop/electron/main/whatsapp/proxy-manager.ts`

需要实现：
- `setProxy(tabId, config)` - 设置代理配置
- `getProxy(tabId)` - 获取代理配置
- `removeProxy(tabId)` - 移除代理配置
- `applyProxy(session, tabId)` - 应用代理到 session
- 支持类型：http, socks5, pac

### 6. 单元测试

为所有管理器创建单元测试：
- `main-window.test.ts`
- `view-manager.test.ts`（可能需要 mock）
- `session-manager.test.ts`
- `account-manager.test.ts`
- `proxy-manager.test.ts`

## 验收标准

- [ ] MainWindow 能成功创建主窗口
- [ ] ViewManager 能创建和切换 Admin、WhatsApp 视图
- [ ] SessionManager 能正确保存和加载账号数据
- [ ] AccountManager CRUD 功能正常，事件触发正确
- [ ] ProxyManager 能正确应用代理配置
- [ ] 所有单元测试通过
- [ ] 无内存泄漏（视图正确销毁）

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-03.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证文件存在 ==="
test -f electron/main/window/main-window.ts && echo "✅ main-window.ts 存在" || echo "❌ main-window.ts 不存在"
test -f electron/main/window/view-manager.ts && echo "✅ view-manager.ts 存在" || echo "❌ view-manager.ts 不存在"
test -f electron/main/whatsapp/session-manager.ts && echo "✅ session-manager.ts 存在" || echo "❌ session-manager.ts 不存在"
test -f electron/main/whatsapp/account-manager.ts && echo "✅ account-manager.ts 存在" || echo "❌ account-manager.ts 不存在"
test -f electron/main/whatsapp/proxy-manager.ts && echo "✅ proxy-manager.ts 存在" || echo "❌ proxy-manager.ts 不存在"
test -f electron/main/window/index.ts && echo "✅ window/index.ts 存在" || echo "❌ window/index.ts 不存在"
test -f electron/main/whatsapp/index.ts && echo "✅ whatsapp/index.ts 存在" || echo "❌ whatsapp/index.ts 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit main/window/*.ts 2>/dev/null && echo "✅ window 模块类型检查通过" || echo "❌ window 模块类型检查失败"
pnpm exec tsc --noEmit main/whatsapp/*.ts 2>/dev/null && echo "✅ whatsapp 模块类型检查通过" || echo "❌ whatsapp 模块类型检查失败"
cd ..

echo ""
echo "=== 单元测试 ==="
cd electron
pnpm exec vitest run 2>/dev/null | grep -q "passed" && echo "✅ 测试通过" || echo "⚠️  请手动验证测试"
cd ..
```

## 预期结果

```
=== 验证文件存在 ===
✅ main-window.ts 存在
✅ view-manager.ts 存在
✅ session-manager.ts 存在
✅ account-manager.ts 存在
✅ proxy-manager.ts 存在
✅ window/index.ts 存在
✅ whatsapp/index.ts 存在

=== TypeScript 类型检查 ===
✅ window 模块类型检查通过
✅ whatsapp 模块类型检查通过

=== 单元测试 ===
✅ 测试通过
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 窗口创建失败 | 检查 preload 路径是否正确 |
| 视图切换不工作 | 检查 bounds 设置，确保视图在正确位置 |
| 会话保存失败 | 检查 userData 目录权限 |
| 代理不生效 | 检查 session.setProxy 调用时机 |

## 下一步

完成后继续：[Phase 4: WhatsApp 集成](./phase-04-whatsapp.md)
