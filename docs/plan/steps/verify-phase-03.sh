#!/bin/bash
# Verify Phase 3: 主进程核心

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
test_count=$(find main -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "找到 $test_count 个测试文件"
if [ "$test_count" -gt 0 ]; then
  pnpm exec vitest run main/**/*.test.ts 2>/dev/null | grep -q "passed" && echo "✅ 测试通过" || echo "⚠️  请检查测试结果"
else
  echo "⚠️  请创建单元测试"
fi
cd ..
