# Phase 7: TabBar 组件

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 7 - TabBar 组件（第 899-1073 行）

## 目标

实现浏览器风格的 TabBar 组件，支持标签切换、拖拽排序和窗口控制。

## 需要处理

### 1. 创建 TabBar 组件

**文件**: `desktop/apps/web-antd/src/layouts/wpp/components/tab-bar.vue`

需要实现：
- **模板结构**：
  - 标签容器（可滚动）
  - 标签项列表
  - 新建标签按钮
  - 窗口控制区（最小化、最大化、关闭）
- **标签项功能**：
  - 显示图标（WhatsApp / Dashboard）
  - 显示标题
  - 显示状态指示器（stopped, starting, qr, ready 等）
  - 关闭按钮（admin 标签除外）
  - 拖拽支持（使用 HTML5 Drag API）
- **窗口控制按钮**：
  - 最小化
  - 最大化/还原（图标切换）
  - 关闭（悬停时红色）
- **交互**：
  - 点击切换标签
  - 拖拽排序
  - 点击关闭按钮

### 2. 实现拖拽排序

使用 HTML5 Drag API：
- `@dragstart` - 记录拖拽的标签
- `@dragover.prevent` - 允许放置
- `@drop` - 处理放置，更新顺序
- `@dragend` - 清理拖拽状态

### 3. 样式实现

- TabBar 高度：40px
- 背景：深色 (#001529)
- 标签项：
  - 默认：半透明白色文字
  - 悬停：白色文字 + 浅色背景
  - 活动：蓝色背景 (#1890ff)
- 状态指示器：不同颜色表示不同状态
- 窗口控制：40px x 40px，悬停效果
- 关闭按钮：悬停时红色 (#ff4d4f)

### 4. 集成图标

使用 Ant Design Vue 图标：
- `WhatsAppOutlined` - WhatsApp 标签
- `DashboardOutlined` - Admin 标签
- `CloseOutlined` - 关闭按钮
- `PlusOutlined` - 新建标签
- `MinusOutlined` - 最小化
- `BorderOutlined` / `CloseSquareOutlined` - 最大化/还原

### 5. 响应式处理

- 处理窗口最大化状态变化
- 处理外部标签更新（通过 Store）

## 验收标准

- [ ] TabBar 正确显示在页面顶部
- [ ] 标签列表正确渲染
- [ ] 点击标签能正确切换
- [ ] 点击关闭按钮能正确关闭标签（admin 除外）
- [ ] 拖拽标签能正确排序
- [ ] 窗口控制按钮正常工作
- [ ] 状态指示器正确显示
- [ ] 样式符合设计要求
- [ ] 无控制台错误

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-07.sh

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
pnpm exec vue-tsc --noEmit src/layouts/wpp/components/tab-bar.vue 2>/dev/null && echo "✅ TabBar 类型检查通过" || echo "⚠️  请手动验证类型"
cd ../..
```

## 预期结果

```
=== 验证 TabBar 组件 ===
✅ tab-bar.vue 存在

=== 检查组件功能 ===
✅ 支持拖拽
✅ 包含窗口控制
✅ 包含状态指示器

=== 检查图标导入 ===
✅ 导入 WhatsApp 图标
✅ 导入关闭图标

=== 检查样式 ===
✅ 包含 TabBar 样式
✅ 包含窗口控制样式

=== TypeScript 检查 ===
✅ TabBar 类型检查通过
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 标签不显示 | 检查 Store 的 tabs 数据是否正确 |
| 点击无响应 | 检查事件处理函数是否正确绑定 |
| 拖拽不工作 | 检查 @dragstart/@dragover/@drop 事件是否正确设置 |
| 样式错乱 | 检查 CSS 选择器是否正确 |
| 窗口控制无效 | 检查 window.electronAPI 是否正确调用 |

## 测试建议

手动测试流程：
1. 启动应用，应该看到一个 admin 标签
2. 点击 "+" 按钮创建新标签
3. 验证新标签出现并自动切换
4. 拖拽标签改变顺序
5. 点击标签进行切换
6. 点击关闭按钮关闭标签
7. 点击窗口控制按钮验证功能

## UI 参考设计

```
┌─────────────────────────────────────────────────────────┐
│ [WhatsApp] [Account1] [Account2] ... [+]   [─][□][×]   │
└─────────────────────────────────────────────────────────┘
   ↑ 活动标签
      ↑ 状态指示器
                                           ↑ 窗口控制
```

## 下一步

完成后继续：[Phase 8: 测试](./phase-08-testing.md)
