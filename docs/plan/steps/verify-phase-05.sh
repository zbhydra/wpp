#!/bin/bash
# Verify Phase 5: 控制器层

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
test_count=$(find main/controllers -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "找到 $test_count 个控制器测试文件"
cd ..
