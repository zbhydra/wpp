# Phase 1: 项目整合

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 1 - 项目整合（第 13-88 行）

## 目标

将 `vue-vben-admin-main` 整合到 `desktop/` 目录，完成基础配置，为 Electron 开发做好准备。

## 需要处理

### 1. 创建 desktop 目录并复制文件

- 在项目根目录下创建 `desktop/` 目录
- 将 `vue-vben-admin-main/` 的所有内容复制到 `desktop/`
- 复制 WA-JS 资源文件（如果存在）

### 2. 创建 Electron 目录结构

创建以下目录：

```
desktop/electron/
├── main/
│   ├── app/         # 应用入口
│   ├── core/        # 核心基础设施
│   ├── window/      # 窗口管理
│   ├── whatsapp/    # WhatsApp 业务
│   ├── controllers/ # 控制器层
│   └── ipc/         # IPC 注册
├── preload/
│   ├── admin/       # Admin View preload
│   └── whatsapp/    # WhatsApp View preload
└── shared/          # 共享代码
    ├── types/
    ├── constants/
    └── utils/
```

### 3. 配置 pnpm workspace

修改 `desktop/pnpm-workspace.yaml`，添加 `electron` 到 packages 列表

### 4. 创建 electron/package.json

配置 Electron 的依赖和脚本：
- 依赖：electron, electron-builder, tsx, typescript
- 脚本：dev, build, typecheck

### 5. 更新主 package.json

在 `desktop/package.json` 中添加 Electron 相关脚本：
- `dev:electron`: 启动 Electron 开发模式
- `build:electron`: 构建 Electron 主进程
- `build:app`: 打包应用

### 6. 安装依赖

运行 `pnpm install` 安装所有依赖

## 验收标准

- [ ] `desktop/` 目录存在且包含完整的项目结构
- [ ] `electron/` 目录结构完整创建
- [ ] `pnpm-workspace.yaml` 包含 `electron` 包
- [ ] `electron/package.json` 配置正确
- [ ] `pnpm install` 成功无错误
- [ ] `pnpm dev` 能启动 vben 开发服务器
- [ ] 依赖安装完整，`node_modules/` 存在

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-01.sh，添加执行权限后运行

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
```

## 预期结果

```
=== 验证目录结构 ===
✅ desktop 目录存在
✅ apps 目录存在
✅ packages 目录存在
✅ electron 目录存在

=== 验证 Electron 目录结构 ===
✅ electron/main 存在
✅ electron/preload 存在
✅ electron/shared 存在

=== 验证配置文件 ===
✅ workspace 包含 electron
✅ electron/package.json 存在
✅ electron/tsconfig.json 存在

=== 验证依赖安装 ===
✅ node_modules 存在
✅ electron/node_modules 存在

=== 验证脚本 ===
✅ dev:electron 脚本存在
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| `desktop/` 目录不存在 | 运行 `mkdir -p desktop` 后重新复制文件 |
| `pnpm install` 失败 | 检查 Node.js >= 20.19.0, pnpm >= 10.0.0 |
| `tsconfig` 路径错误 | 确保 `desktop/packages/tsconfig/node.json` 存在 |

## 下一步

完成后继续：[Phase 2: 核心层](./phase-02-core.md)
