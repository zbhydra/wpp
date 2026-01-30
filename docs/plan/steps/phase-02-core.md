# Phase 2: 核心层

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 2 - 核心层（第 91-247 行）

## 目标

实现主进程的核心基础设施，包括依赖注入容器、日志系统和共享类型定义。

## 需要处理

### 1. 实现依赖注入容器 (ServiceContainer)

**文件**: `desktop/electron/main/core/di/service-container.ts`

需要实现：
- `register<T>(key, factory)` - 注册服务工厂
- `resolve<T>(key)` - 解析服务实例（单例模式）
- `has(key)` - 检查服务是否已注册
- `clear()` - 清空所有服务（测试用）
- `getRegisteredServices()` - 获取所有已注册服务名称

**导出**: 创建 `index.ts` 导出 ServiceContainer 和 ServiceFactory 类型

### 2. 实现日志系统 (Logger)

**文件**: `desktop/electron/main/core/logger/logger.ts`

需要实现：
- `LogLevel` 枚举：DEBUG, INFO, WARN, ERROR
- `Logger` 类：
  - `setLevel(level)` - 设置日志级别
  - `debug(message, ...args)` - 调试日志
  - `info(message, ...args)` - 信息日志
  - `warn(message, ...args)` - 警告日志
  - `error(message, error?)` - 错误日志

**导出**: 创建 `index.ts` 导出 Logger 和 LogLevel

### 3. 定义共享类型

**文件**: `desktop/electron/shared/types/tabs.ts`

定义以下类型：
- `TabType`: 'admin' | 'whatsapp'
- `TabStatus`: 'stopped' | 'starting' | 'qr' | 'ready' | 'logged_in' | 'logged_out' | 'error'
- `BaseTab` 接口
- `AdminTab` 接口（extends BaseTab）
- `WhatsAppTab` 接口（extends BaseTab）
- `Tab` 类型（AdminTab | WhatsAppTab）
- `ProxyConfig` 接口

**文件**: `desktop/electron/shared/types/ipc.ts`

定义以下类型：
- `IPCInvokeMap` 接口 - 所有 invoke 类型的 IPC 调用
- `IPCEventMap` 接口 - 所有事件类型的 IPC 通信

**导出**: 创建 `index.ts` 导出所有类型

### 4. 单元测试

为 ServiceContainer 和 Logger 创建单元测试：
- `service-container.test.ts`
- `logger.test.ts`

## 验收标准

- [ ] ServiceContainer 实现完整，支持注册和解析服务
- [ ] Logger 实现完整，支持所有日志级别
- [ ] 共享类型定义完整，无 TypeScript 错误
- [ ] ServiceContainer 单元测试通过（覆盖率 > 80%）
- [ ] Logger 单元测试通过（覆盖率 > 80%）
- [ ] 所有导出文件正确导出类型和类

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-02.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证文件存在 ==="
test -f electron/main/core/di/service-container.ts && echo "✅ service-container.ts 存在" || echo "❌ service-container.ts 不存在"
test -f electron/main/core/di/index.ts && echo "✅ di/index.ts 存在" || echo "❌ di/index.ts 不存在"
test -f electron/main/core/logger/logger.ts && echo "✅ logger.ts 存在" || echo "❌ logger.ts 不存在"
test -f electron/main/core/logger/index.ts && echo "✅ logger/index.ts 存在" || echo "❌ logger/index.ts 不存在"
test -f electron/shared/types/tabs.ts && echo "✅ tabs.ts 存在" || echo "❌ tabs.ts 不存在"
test -f electron/shared/types/ipc.ts && echo "✅ ipc.ts 存在" || echo "❌ ipc.ts 不存在"
test -f electron/shared/types/index.ts && echo "✅ types/index.ts 存在" || echo "❌ types/index.ts 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit main/core/di/service-container.ts 2>/dev/null && echo "✅ service-container.ts 类型检查通过" || echo "❌ service-container.ts 类型检查失败"
pnpm exec tsc --noEmit main/core/logger/logger.ts 2>/dev/null && echo "✅ logger.ts 类型检查通过" || echo "❌ logger.ts 类型检查失败"
pnpm exec tsc --noEmit shared/types/tabs.ts 2>/dev/null && echo "✅ tabs.ts 类型检查通过" || echo "❌ tabs.ts 类型检查失败"
cd ..

echo ""
echo "=== 单元测试 ==="
cd electron
pnpm exec vitest run main/core/di/service-container.test.ts 2>/dev/null | grep -q "passed" && echo "✅ ServiceContainer 测试通过" || echo "❌ ServiceContainer 测试失败"
pnpm exec vitest run main/core/logger/logger.test.ts 2>/dev/null | grep -q "passed" && echo "✅ Logger 测试通过" || echo "❌ Logger 测试失败"
cd ..
```

## 预期结果

```
=== 验证文件存在 ===
✅ service-container.ts 存在
✅ di/index.ts 存在
✅ logger.ts 存在
✅ logger/index.ts 存在
✅ tabs.ts 存在
✅ ipc.ts 存在
✅ types/index.ts 存在

=== TypeScript 类型检查 ===
✅ service-container.ts 类型检查通过
✅ logger.ts 类型检查通过
✅ tabs.ts 类型检查通过

=== 单元测试 ===
✅ ServiceContainer 测试通过
✅ Logger 测试通过
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| TypeScript 类型错误 | 检查 tsconfig.json 配置，确保路径别名正确 |
| 测试失败 | 检查测试代码逻辑，查看 vitest 输出的详细错误 |
| 导出错误 | 确保 index.ts 正确导出了所有需要的类型和类 |

## 下一步

完成后继续：[Phase 3: 主进程核心](./phase-03-main-process.md)
