#!/bin/bash
# Verify Phase 6: 渲染进程

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
