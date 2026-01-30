#!/bin/bash
# Verify Phase 8: 测试

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 检查测试文件 ==="
test_files=(
  "electron/main/core/di/service-container.test.ts"
  "electron/main/core/logger/logger.test.ts"
  "electron/main/whatsapp/account-manager.test.ts"
  "electron/main/controllers/whatsapp-controller.test.ts"
)

found=0
for file in "${test_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
    ((found++))
  else
    echo "❌ $file 不存在"
  fi
done

echo ""
echo "找到 $found / ${#test_files[@]} 个测试文件"

echo ""
echo "=== 检查测试配置 ==="
test -f vitest.config.ts && echo "✅ vitest.config.ts 存在" || echo "❌ vitest.config.ts 不存在"
test -f playwright.config.ts && echo "✅ playwright.config.ts 存在" || echo "⚠️  playwright.config.ts 不存在（可选）"

echo ""
echo "=== 运行单元测试 ==="
if command -v pnpm &> /dev/null; then
  cd electron
  pnpm exec vitest run --reporter=verbose 2>&1 | tail -10
  cd ..
else
  echo "⚠️  pnpm 不可用，跳过测试运行"
fi

echo ""
echo "=== 检查测试覆盖率 ==="
if command -v pnpm &> /dev/null; then
  cd electron
  pnpm exec vitest run --coverage 2>&1 | grep -A 3 "Coverage" || echo "⚠️  请安装 @vitest/coverage"
  cd ..
else
  echo "⚠️  pnpm 不可用，跳过覆盖率检查"
fi
