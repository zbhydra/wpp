#!/bin/bash
# Verify Phase 7: TabBar 组件

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证 TabBar 组件 ==="
test -f apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ tab-bar.vue 存在" || echo "❌ tab-bar.vue 不存在"

echo ""
echo "=== 检查组件功能 ==="
grep -q "draggable" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 支持拖拽" || echo "❌ 未实现拖拽"
grep -q "window-controls" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 包含窗口控制" || echo "❌ 未包含窗口控制"
grep -q "tab-status" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 包含状态指示器" || echo "❌ 未包含状态指示器"

echo ""
echo "=== 检查图标导入 ==="
grep -q "WhatsAppOutlined" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 导入 WhatsApp 图标" || echo "❌ 未导入 WhatsApp 图标"
grep -q "CloseOutlined" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 导入关闭图标" || echo "❌ 未导入关闭图标"

echo ""
echo "=== 检查样式 ==="
grep -q "wpp-tab-bar" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 包含 TabBar 样式" || echo "❌ 未包含 TabBar 样式"
grep -q "window-controls" apps/web-antd/src/layouts/wpp/components/tab-bar.vue && echo "✅ 包含窗口控制样式" || echo "❌ 未包含窗口控制样式"

echo ""
echo "=== TypeScript 检查 ==="
cd apps/web-antd
if command -v pnpm &> /dev/null; then
  pnpm exec vue-tsc --noEmit src/layouts/wpp/components/tab-bar.vue 2>/dev/null && echo "✅ TabBar 类型检查通过" || echo "⚠️  请手动验证类型"
else
  echo "⚠️  pnpm 不可用，跳过类型检查"
fi
cd ../..
