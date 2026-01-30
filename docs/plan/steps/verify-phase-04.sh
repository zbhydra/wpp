#!/bin/bash
# Verify Phase 4: WhatsApp 集成

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证 WA-JS 资源 ==="
test -d resources/wa-js && echo "✅ wa-js 目录存在" || echo "❌ wa-js 目录不存在"
test -f resources/wa-js/wpp.js && echo "✅ wpp.js 存在" || echo "⚠️  wpp.js 不存在，请手动复制"

echo ""
echo "=== 验证 Preload 脚本 ==="
test -f electron/preload/whatsapp/index.ts && echo "✅ whatsapp preload 存在" || echo "❌ whatsapp preload 不存在"
test -f electron/preload/whatsapp/types.ts && echo "✅ whatsapp types 存在" || echo "❌ whatsapp types 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit preload/whatsapp/*.ts 2>/dev/null && echo "✅ whatsapp preload 类型检查通过" || echo "❌ whatsapp preload 类型检查失败"
cd ..

echo ""
echo "=== 检查 IPC 处理器 ==="
grep -r "wa-js:get-content" electron/main/ipc/*.ts 2>/dev/null > /dev/null && echo "✅ wa-js IPC 处理器已注册" || echo "⚠️  请检查 IPC 注册"
