# Phase 8: 测试

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 8 - 测试（第 1075-1125 行）

## 目标

编写单元测试和 E2E 测试，确保代码质量和功能正确性。

## 需要处理

### 1. 完善单元测试

确保以下模块都有单元测试（覆盖率 > 80%）：

**核心层**：
- `service-container.test.ts`
- `logger.test.ts`

**主进程**：
- `main-window.test.ts`
- `view-manager.test.ts`
- `session-manager.test.ts`
- `account-manager.test.ts`
- `proxy-manager.test.ts`

**控制器**：
- `whatsapp-controller.test.ts`
- `tab-controller.test.ts`
- `window-controller.test.ts`

**渲染进程**：
- `wpp.test.ts` (Pinia store 测试)
- `tab-bar.test.ts` (组件测试)

### 2. 配置测试环境

**Vitest 配置**: `desktop/vitest.config.ts`

需要配置：
- 测试环境：happy-dom 或 jsdom
- 覆盖率阈值：80%
- 别名配置：与 tsconfig 一致

### 3. 编写 E2E 测试

**Playwright 配置**: `desktop/playwright.config.ts`

需要编写以下 E2E 测试场景：

**场景 1: 创建账号**
- 打开应用
- 点击创建标签按钮
- 输入账号名称
- 确认创建
- 验证标签出现

**场景 2: 标签切换**
- 创建多个标签
- 点击不同标签
- 验证活动标签正确

**场景 3: 关闭标签**
- 创建标签
- 点击关闭按钮
- 验证标签被删除

**场景 4: 窗口控制**
- 点击最小化
- 验证窗口最小化
- 点击最大化
- 验证窗口最大化

**场景 5: 拖拽排序**
- 创建多个标签
- 拖拽标签改变顺序
- 验证顺序正确

### 4. 创建测试脚本

在 `package.json` 中添加：
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 5. 设置 CI/CD 测试（可选）

创建 `.github/workflows/test.yml`：
- 每次 PR 自动运行测试
- 检查测试覆盖率

## 验收标准

- [ ] 所有单元测试通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 所有 E2E 测试通过
- [ ] 无已知 bug
- [ ] 测试可以在 CI 中运行

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-08.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 检查测试文件 ==="
test_files=(
  "electron/main/core/di/service-container.test.ts"
  "electron/main/core/logger/logger.test.ts"
  "electron/main/whatsapp/account-manager.test.ts"
  "electron/main/controllers/whatsapp-controller.test.ts"
  "apps/web-antd/src/store/modules/wpp.test.ts"
)

for file in "${test_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file 不存在"
  fi
done

echo ""
echo "=== 检查测试配置 ==="
test -f vitest.config.ts && echo "✅ vitest.config.ts 存在" || echo "❌ vitest.config.ts 不存在"
test -f playwright.config.ts && echo "✅ playwright.config.ts 存在" || echo "❌ playwright.config.ts 不存在"

echo ""
echo "=== 运行单元测试 ==="
cd electron
pnpm exec vitest run --reporter=verbose 2>&1 | tail -20
cd ..

echo ""
echo "=== 检查测试覆盖率 ==="
cd electron
pnpm exec vitest run --coverage 2>&1 | grep -A 5 "% Coverage"
cd ..
```

## 预期结果

```
=== 检查测试文件 ===
✅ electron/main/core/di/service-container.test.ts
✅ electron/main/core/logger/logger.test.ts
✅ electron/main/whatsapp/account-manager.test.ts
✅ electron/main/controllers/whatsapp-controller.test.ts
✅ apps/web-antd/src/store/modules/wpp.test.ts

=== 检查测试配置 ===
✅ vitest.config.ts 存在
✅ playwright.config.ts 存在

=== 运行单元测试 ===
Test Files  10 passed (10)
     Tests  42 passed (42)

=== 检查测试覆盖率 ===
% Coverage
  Statements  85.3%
  Branches    82.1%
  Functions   88.5%
  Lines       84.7%
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 测试无法运行 | 检查 vitest/playwright 是否正确安装 |
| 覆盖率低 | 补充测试用例，关注边界情况 |
| E2E 测试不稳定 | 增加等待时间，使用更稳定的选择器 |
| Mock 失败 | 检查 mock 配置是否正确 |

## 测试命令

```bash
# 运行所有单元测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 运行 E2E 测试
pnpm test:e2e

# 运行 E2E 测试（UI 模式）
pnpm test:e2e:ui

# 运行特定测试文件
pnpm test electron/main/core/di/service-container.test.ts
```

## 测试建议

1. **单元测试**：
   - 测试所有公共方法
   - 测试边界情况
   - 测试错误处理
   - 使用 mock 隔离依赖

2. **E2E 测试**：
   - 模拟真实用户操作
   - 测试关键流程
   - 使用 Page Object Model
   - 添加足够的等待时间

## 下一步

完成后继续：[Phase 9: 打包部署](./phase-09-build.md)
