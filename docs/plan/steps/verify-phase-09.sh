#!/bin/bash
# Verify Phase 9: 打包部署

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 检查配置文件 ==="
test -f electron-builder.json && echo "✅ electron-builder.json 存在" || echo "❌ electron-builder.json 不存在"
test -f scripts/electron/build.ts && echo "✅ build.ts 存在" || echo "❌ build.ts 不存在"

echo ""
echo "=== 检查应用图标 ==="
test -f resources/icons/icon.png && echo "✅ icon.png 存在" || echo "⚠️  icon.png 不存在"
test -f resources/icons/icon.ico && echo "✅ icon.ico 存在" || echo "⚠️  icon.ico 不存在（Windows 需要）"
test -f resources/icons/icon.icns && echo "✅ icon.icns 存在" || echo "⚠️  icon.icns 不存在（macOS 需要）"

echo ""
echo "=== 检查构建脚本 ==="
grep -q "build:app" package.json && echo "✅ build:app 脚本存在" || echo "❌ build:app 脚本不存在"
grep -q "build:app:win" package.json && echo "✅ build:app:win 脚本存在" || echo "❌ build:app:win 脚本不存在"
grep -q "build:app:mac" package.json && echo "✅ build:app:mac 脚本存在" || echo "❌ build:app:mac 脚本不存在"

echo ""
echo "=== 检查输出目录 ==="
test -d release && echo "✅ release 目录存在" || echo "⚠️  release 目录不存在（需要先运行构建）"

if [ -d release ]; then
  echo ""
  echo "=== 构建输出 ==="
  ls -lh release/ | head -10
fi

echo ""
echo "=== 提示 ==="
echo "运行 'pnpm build:app' 来构建应用"
