# Phase 6: 渲染进程

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 6 - 渲染进程（第 766-897 行）

## 目标

实现渲染进程的功能，包括 Admin Preload、WPP Store 和 WPP 布局。

## 需要处理

### 1. 实现 Admin Preload

**文件**: `desktop/electron/preload/admin/index.ts`

需要实现：
- 暴露 Electron API 到 `window.electronAPI`
- 提供以下 API：
  - `tabs` - 标签操作
    - `create(data)` - 创建标签
    - `close(tabId)` - 关闭标签
    - `switch(tabId)` - 切换标签
    - `onCreated(callback)` - 监听创建事件
    - `onClosed(callback)` - 监听关闭事件
    - `onUpdated(callback)` - 监听更新事件
  - `whatsapp` - WhatsApp 操作
    - `createAccount(data)` - 创建账号
    - `getAccounts()` - 获取账号列表
    - `startAccount(accountId)` - 启动账号
    - `stopAccount(accountId)` - 停止账号
  - `window` - 窗口操作
    - `minimize()` - 最小化
    - `maximize()` - 最大化
    - `close()` - 关闭
- 使用 `contextBridge` 暴露 API

### 2. 定义 Preload 类型

**文件**: `desktop/electron/preload/admin/types.ts`

定义暴露给渲染进程的 API 类型。

### 3. 实现 WPP Store

**文件**: `desktop/apps/web-antd/src/store/modules/wpp.ts`

需要实现：
- 状态：
  - `tabs` - 标签列表
  - `activeTabId` - 当前活动标签 ID
- 方法：
  - `switchTab(tabId)` - 切换标签
  - `createNewWhatsAppTab()` - 创建新 WhatsApp 标签
  - `closeTab(tabId)` - 关闭标签
  - `setupListeners()` - 设置事件监听
- 使用 Pinia store

### 4. 修改 bootstrap.ts

**文件**: `desktop/apps/web-antd/src/bootstrap.ts`

在应用初始化时调用 `wppStore.setupListeners()`

### 5. 创建 WPP 布局

**文件**: `desktop/apps/web-antd/src/layouts/wpp/index.vue`

需要实现：
- 布局结构：
  - TabBar（顶部）
  - 内容区域（中间，占满剩余空间）
- 样式：
  - 全屏高度
  - Flex 布局
  - 内容区域可滚动

### 6. 创建 WPP 路由

**文件**: `desktop/apps/web-antd/src/router/routes/wpp.ts`

配置 WPP 相关的路由。

### 7. 添加 TypeScript 类型声明

**文件**: `desktop/apps/web-antd/src/types/electron.d.ts`

为 `window.electronAPI` 添加类型声明。

## 验收标准

- [ ] Admin Preload 正确暴露所有 API
- [ ] `window.electronAPI` 在渲染进程中可用
- [ ] WPP Store 正确管理标签状态
- [ ] 标签切换、创建、关闭功能正常
- [ ] WPP 布局正确显示
- [ ] TypeScript 类型声明完整
- [ ] 无控制台错误

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-06.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证 Preload 文件 ==="
test -f electron/preload/admin/index.ts && echo "✅ admin preload 存在" || echo "❌ admin preload 不存在"
test -f electron/preload/admin/types.ts && echo "✅ admin types 存在" || echo "❌ admin types 不存在"

echo ""
echo "=== 验证 Store 文件 ==="
test -f apps/web-antd/src/store/modules/wpp.ts && echo "✅ wpp store 存在" || echo "❌ wpp store 不存在"

echo ""
echo "=== 验证布局文件 ==="
test -f apps/web-antd/src/layouts/wpp/index.vue && echo "✅ wpp layout 存在" || echo "❌ wpp layout 不存在"

echo ""
echo "=== 验证类型声明 ==="
test -f apps/web-antd/src/types/electron.d.ts && echo "✅ electron types 存在" || echo "❌ electron types 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit preload/admin/*.ts 2>/dev/null && echo "✅ admin preload 类型检查通过" || echo "❌ admin preload 类型检查失败"
cd ..

echo ""
echo "=== 检查 bootstrap 集成 ==="
grep -q "wppStore" apps/web-antd/src/bootstrap.ts && echo "✅ bootstrap 已集成 wppStore" || echo "❌ bootstrap 未集成 wppStore"

echo ""
echo "=== 检查 contextBridge 使用 ==="
grep -q "contextBridge" electron/preload/admin/index.ts && echo "✅ 使用 contextBridge 暴露 API" || echo "❌ 未使用 contextBridge"
```

## 预期结果

```
=== 验证 Preload 文件 ===
✅ admin preload 存在
✅ admin types 存在

=== 验证 Store 文件 ===
✅ wpp store 存在

=== 验证布局文件 ===
✅ wpp layout 存在

=== 验证类型声明 ===
✅ electron types 存在

=== TypeScript 类型检查 ===
✅ admin preload 类型检查通过

=== 检查 bootstrap 集成 ===
✅ bootstrap 已集成 wppStore

=== 检查 contextBridge 使用 ===
✅ 使用 contextBridge 暴露 API
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| `window.electronAPI` 未定义 | 检查 preload 路径配置，确保 contextBridge 正确使用 |
| Store 状态不同步 | 检查事件监听是否正确设置 |
| TypeScript 类型错误 | 确保 electron.d.ts 正确声明类型 |
| 布局不显示 | 检查路由配置和组件导入 |

## 测试建议

手动测试：
1. 启动开发服务器
2. 打开浏览器控制台
3. 检查 `window.electronAPI` 是否存在
4. 尝试调用 API 创建标签
5. 检查 Store 状态是否更新

## 下一步

完成后继续：[Phase 7: TabBar 组件](./phase-07-tabbar.md)
