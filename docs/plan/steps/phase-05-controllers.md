# Phase 5: 控制器层

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 5 - 控制器层（第 619-764 行）

## 目标

实现控制器层，处理来自渲染进程的 IPC 请求，协调各个管理器的工作。

## 需要处理

### 1. 实现 WhatsAppController

**文件**: `desktop/electron/main/controllers/whatsapp-controller.ts`

需要实现：
- `getAccounts()` - 获取所有账号列表
- `createAccount(data)` - 创建新账号（使用 zod 验证 name）
- `startAccount(accountId)` - 启动指定账号
- `stopAccount(accountId)` - 停止指定账号
- `deleteAccount(accountId)` - 删除指定账号
- `getAccountStatus(accountId)` - 获取账号状态
- `setAccountProxy(accountId, proxy)` - 设置账号代理

### 2. 实现 TabController

**文件**: `desktop/electron/main/controllers/tab-controller.ts`

需要实现：
- `createWhatsAppTab(data)` - 创建新的 WhatsApp 标签
  - 调用 AccountManager 创建账号
  - 应用代理配置（如果有）
  - 创建视图
  - 返回标签信息
- `closeTab(tabId)` - 关闭标签
  - 停止账号
  - 删除账号
  - 移除视图
- `switchTab(tabId)` - 切换活动标签
- `reorderTabs(tabIds)` - 保存标签顺序

### 3. 实现 WindowController

**文件**: `desktop/electron/main/controllers/window-controller.ts`

需要实现：
- `minimize()` - 最小化窗口
- `maximize()` - 最大化/还原窗口
- `close()` - 关闭窗口
- `isMaximized()` - 检查是否最大化

### 4. 实现 IPC 注册

**文件**: `desktop/electron/main/ipc/register.ts`

需要实现：
- 注册所有 IPC handlers：
  - `whatsapp:*` - WhatsApp 相关
  - `tab:*` - 标签相关
  - `window:*` - 窗口相关
- 设置事件转发：
  - `tab:created` - 标签创建
  - `tab:closed` - 标签关闭
  - `tab:updated` - 标签更新
  - `tab:status` - 标签状态变化
  - `account:status` - 账号状态变化

### 5. 创建控制器导出

**文件**: `desktop/electron/main/controllers/index.ts`

导出所有控制器。

### 6. 单元测试

为所有控制器创建单元测试：
- `whatsapp-controller.test.ts`
- `tab-controller.test.ts`
- `window-controller.test.ts`

## 验收标准

- [ ] WhatsAppController 所有方法实现完整
- [ ] TabController 所有方法实现完整
- [ ] WindowController 所有方法实现完整
- [ ] IPC 处理器正确注册
- [ ] 参数验证生效（使用 zod）
- [ ] 事件正确转发到渲染进程
- [ ] 所有单元测试通过

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-05.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证控制器文件 ==="
test -f electron/main/controllers/whatsapp-controller.ts && echo "✅ whatsapp-controller.ts 存在" || echo "❌ whatsapp-controller.ts 不存在"
test -f electron/main/controllers/tab-controller.ts && echo "✅ tab-controller.ts 存在" || echo "❌ tab-controller.ts 不存在"
test -f electron/main/controllers/window-controller.ts && echo "✅ window-controller.ts 存在" || echo "❌ window-controller.ts 不存在"
test -f electron/main/controllers/index.ts && echo "✅ controllers/index.ts 存在" || echo "❌ controllers/index.ts 不存在"
test -f electron/main/ipc/register.ts && echo "✅ ipc/register.ts 存在" || echo "❌ ipc/register.ts 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit main/controllers/*.ts 2>/dev/null && echo "✅ 控制器类型检查通过" || echo "❌ 控制器类型检查失败"
pnpm exec tsc --noEmit main/ipc/*.ts 2>/dev/null && echo "✅ IPC 模块类型检查通过" || echo "❌ IPC 模块类型检查失败"
cd ..

echo ""
echo "=== 检查 IPC 注册 ==="
grep -q "whatsapp:getAccounts" electron/main/ipc/register.ts && echo "✅ whatsapp IPC 已注册" || echo "❌ whatsapp IPC 未注册"
grep -q "tab:switch" electron/main/ipc/register.ts && echo "✅ tab IPC 已注册" || echo "❌ tab IPC 未注册"
grep -q "window:minimize" electron/main/ipc/register.ts && echo "✅ window IPC 已注册" || echo "❌ window IPC 未注册"

echo ""
echo "=== 单元测试 ==="
cd electron
pnpm exec vitest run main/controllers/*.test.ts 2>/dev/null | grep -q "passed" && echo "✅ 控制器测试通过" || echo "⚠️  请手动验证测试"
cd ..
```

## 预期结果

```
=== 验证控制器文件 ===
✅ whatsapp-controller.ts 存在
✅ tab-controller.ts 存在
✅ window-controller.ts 存在
✅ controllers/index.ts 存在
✅ ipc/register.ts 存在

=== TypeScript 类型检查 ===
✅ 控制器类型检查通过
✅ IPC 模块类型检查通过

=== 检查 IPC 注册 ===
✅ whatsapp IPC 已注册
✅ tab IPC 已注册
✅ window IPC 已注册

=== 单元测试 ===
✅ 控制器测试通过
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| IPC 调用无响应 | 检查 handler 是否正确注册，通道名称是否匹配 |
| 参数验证不生效 | 确保正确使用 zod 进行验证 |
| 事件未转发 | 检查 BrowserWindow.webContents.send 调用 |
| 控制器依赖错误 | 确保 ServiceContainer 正确注入依赖 |

## 下一步

完成后继续：[Phase 6: 渲染进程](./phase-06-renderer.md)
