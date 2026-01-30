# WPP Manager 实施步骤

## 使用说明

1. **按顺序执行**：每个 Phase 都有前置依赖，必须按顺序完成
2. **整体验收**：每个 Phase 完成后，必须通过所有验收标准才能进入下一步
3. **独立可回滚**：每个 Phase 都是独立的，出错后可以回滚

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | >= 20.19.0 | 22.22.0 |
| pnpm | >= 10.0.0 | 10.28.2 |

### 检查和准备环境

```bash
# 检查版本
node --version
pnpm --version

# 如需升级 pnpm
npm install -g pnpm@10.28.2 --force
# 重新打开终端后验证
pnpm --version
```

## 步骤列表

| Phase | 文件 | 描述 | 预计时间 | 状态 |
|-------|------|------|----------|------|
| 1 | [phase-01-integration.md](./phase-01-integration.md) | 项目整合 - 创建 desktop 目录，整合 vue-vben-admin | 2 天 | ⏳ 待开始 |
| 2 | [phase-02-core.md](./phase-02-core.md) | 核心层 - DI 容器、日志、共享类型 | 2 天 | ⏳ 待开始 |
| 3 | [phase-03-main-process.md](./phase-03-main-process.md) | 主进程核心 - 窗口、视图、会话、账号、代理管理 | 4 天 | ⏳ 待开始 |
| 4 | [phase-04-whatsapp.md](./phase-04-whatsapp.md) | WhatsApp 集成 - WA-JS 注入和 Preload | 4 天 | ⏳ 待开始 |
| 5 | [phase-05-controllers.md](./phase-05-controllers.md) | 控制器层 - WhatsApp 和 Tab 控制器 | 2 天 | ⏳ 待开始 |
| 6 | [phase-06-renderer.md](./phase-06-renderer.md) | 渲染进程 - Preload、Store、布局 | 3 天 | ⏳ 待开始 |
| 7 | [phase-07-tabbar.md](./phase-07-tabbar.md) | TabBar 组件 - 标签栏 UI 实现 | 2 天 | ⏳ 待开始 |
| 8 | [phase-08-testing.md](./phase-08-testing.md) | 测试 - 单元测试和 E2E 测试 | 3 天 | ⏳ 待开始 |
| 9 | [phase-09-build.md](./phase-09-build.md) | 打包部署 - electron-builder 配置 | 2 天 | ⏳ 待开始 |

## 状态图例

- ⏳ 待开始
- 🚧 进行中
- ✅ 已完成
- ❌ 失败/阻塞

## 快速开始

```bash
# 从 Phase 1 开始
cd docs/plan/steps
cat phase-01-integration.md
```

## 验证命令

每个 Phase 完成后，运行对应的验证脚本：

```bash
# Phase 1 验证
cd docs/plan/steps && ./verify-phase-01.sh

# Phase 2 验证
cd docs/plan/steps && ./verify-phase-02.sh
```

## 相关文档

- [架构设计](../claude-glm-reborn-001-architecture.md)
- [核心需求](../claude-glm-reborn-core-requirements.md)
- [原实施计划](../claude-glm-reborn-002-implementation.md)
