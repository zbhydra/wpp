---
name: code-checker
description: 代码质量检查技能。在编辑 Python、TypeScript 或 Vue 文件后自动运行代码检查工具。
---

# Code Checker

## 目的

自动执行代码质量检查，确保代码符合项目规范和质量标准。在每次编辑文件后自动运行相应的检查工具。

## 何时使用

当你在以下情况下编辑文件时：

- **Python 文件** (`.py`): 自动运行 black、ruff、mypy、pytest
- **TypeScript 文件** (`.ts`, `.tsx`): 自动运行 vue-tsc、eslint、构建测试
- **Vue 文件** (`.vue`): 自动运行 vue-tsc、eslint、构建测试

## 工作原理

### 1. 文件跟踪 (PostToolUse Hook)

- 跟踪所有编辑过的文件
- 检测文件所属的仓库 (backend/src)
- 按仓库分组编辑的文件

### 2. 代码检查 (Stop Hook)

在每个会话结束时，自动运行相应的检查工具：

### 3. 质量审查
**行动**：
1. 并行启动3个 code-reviewer agent，每个agent关注不同的方面：简洁性/DRY（Don't Repeat Yourself，避免重复）/优雅性，错误/功能正确性，项目约定/抽象性 
2. 汇总审查结果，并确定您建议修复的严重程度最高的问题 
3. 向用户展示审查结果，并询问他们的处理意愿**（立即修复、稍后修复或按原样继续） 
4. 根据用户的决定处理问题

#### Python 检查 (app 目录)

```bash
# 格式化检查
pdm run black --check .

# 代码检查
pdm run ruff check .

# 类型检查
pdm run mypy .

# 测试
pdm run pytest
```

#### TypeScript/Vue 检查 (web 目录)

```bash
# 类型检查
npx vue-tsc --noEmit

# 代码检查
pnpm run lint

# 构建测试
pnpm run build
```

## 检查结果

检查完成后会显示：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 CODE QUALITY CHECK RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ app (python)
  ✓ black
  ✓ ruff
  ✓ mypy
  ✓ pytest

❌ web (typescript)
  ✓ vue-tsc
  ✗ eslint
    error: Unexpected console statement
    ...
  ✓ build

⚠️  Found 1 issue(s). Please review and fix.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 禁用检查

### 临时禁用

```bash
export SKIP_CODE_QUALITY_CHECKS=true
```