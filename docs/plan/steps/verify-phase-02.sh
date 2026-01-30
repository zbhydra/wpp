#!/bin/bash
# Verify Phase 2: 核心层

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证文件存在 ==="
test -f electron/main/core/di/service-container.ts && echo "✅ service-container.ts 存在" || echo "❌ service-container.ts 不存在"
test -f electron/main/core/di/index.ts && echo "✅ di/index.ts 存在" || echo "❌ di/index.ts 不存在"
test -f electron/main/core/logger/logger.ts && echo "✅ logger.ts 存在" || echo "❌ logger.ts 不存在"
test -f electron/main/core/logger/index.ts && echo "✅ logger/index.ts 存在" || echo "❌ logger/index.ts 不存在"
test -f electron/shared/types/tabs.ts && echo "✅ tabs.ts 存在" || echo "❌ tabs.ts 不存在"
test -f electron/shared/types/ipc.ts && echo "✅ ipc.ts 存在" || echo "❌ ipc.ts 不存在"
test -f electron/shared/types/index.ts && echo "✅ types/index.ts 存在" || echo "❌ types/index.ts 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit main/core/di/service-container.ts 2>/dev/null && echo "✅ service-container.ts 类型检查通过" || echo "❌ service-container.ts 类型检查失败"
pnpm exec tsc --noEmit main/core/logger/logger.ts 2>/dev/null && echo "✅ logger.ts 类型检查通过" || echo "❌ logger.ts 类型检查失败"
pnpm exec tsc --noEmit shared/types/tabs.ts 2>/dev/null && echo "✅ tabs.ts 类型检查通过" || echo "❌ tabs.ts 类型检查失败"
cd ..

echo ""
echo "=== 单元测试 ==="
cd electron
if [ -f main/core/di/service-container.test.ts ]; then
  pnpm exec vitest run main/core/di/service-container.test.ts 2>/dev/null | grep -q "passed" && echo "✅ ServiceContainer 测试通过" || echo "❌ ServiceContainer 测试失败"
else
  echo "⚠️  ServiceContainer 测试文件不存在"
fi

if [ -f main/core/logger/logger.test.ts ]; then
  pnpm exec vitest run main/core/logger/logger.test.ts 2>/dev/null | grep -q "passed" && echo "✅ Logger 测试通过" || echo "❌ Logger 测试失败"
else
  echo "⚠️  Logger 测试文件不存在"
fi
cd ..
