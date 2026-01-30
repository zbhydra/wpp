#!/bin/bash

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证目录结构 ==="
test -d desktop && echo "✅ desktop 目录存在" || echo "❌ desktop 目录不存在"
test -d desktop/apps && echo "✅ apps 目录存在" || echo "❌ apps 目录不存在"
test -d desktop/packages && echo "✅ packages 目录存在" || echo "❌ packages 目录不存在"
test -d desktop/electron && echo "✅ electron 目录存在" || echo "❌ electron 目录不存在"

echo ""
echo "=== 验证 Electron 目录结构 ==="
test -d desktop/electron/main && echo "✅ electron/main 存在" || echo "❌ electron/main 不存在"
test -d desktop/electron/preload && echo "✅ electron/preload 存在" || echo "❌ electron/preload 不存在"
test -d desktop/electron/shared && echo "✅ electron/shared 存在" || echo "❌ electron/shared 不存在"

echo ""
echo "=== 验证配置文件 ==="
grep -q "electron" desktop/pnpm-workspace.yaml && echo "✅ workspace 包含 electron" || echo "❌ workspace 未包含 electron"
test -f desktop/electron/package.json && echo "✅ electron/package.json 存在" || echo "❌ electron/package.json 不存在"
test -f desktop/electron/tsconfig.json && echo "✅ electron/tsconfig.json 存在" || echo "❌ electron/tsconfig.json 不存在"

echo ""
echo "=== 验证依赖安装 ==="
test -d desktop/node_modules && echo "✅ node_modules 存在" || echo "❌ node_modules 不存在"
test -d desktop/electron/node_modules && echo "✅ electron/node_modules 存在" || echo "❌ electron/node_modules 不存在"

echo ""
echo "=== 验证脚本 ==="
grep -q "dev:electron" desktop/package.json && echo "✅ dev:electron 脚本存在" || echo "❌ dev:electron 脚本不存在"
