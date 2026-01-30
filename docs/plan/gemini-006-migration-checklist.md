# 006. 迁移实施清单 (Migration Checklist)

请按照以下顺序执行，每完成一项打钩。

## Phase 1: 环境准备 (Environment)
- [ ] 创建 `apps/electron-main` 目录与 `package.json`
- [ ] 清理 `apps/web-naive`, `apps/web-ele`, `playground`
- [ ] 运行 `pnpm install` 确保无依赖错误
- [ ] 修改 `apps/web-antd/vite.config.mts` 指向新的 electron 入口
- [ ] 启动 `pnpm dev:antd` 验证 Electron 窗口能正常弹出 Vben 登录页

## Phase 2: 主进程基础 (Main Process Logic)
- [ ] 移植 `logger.ts` 和 `paths.ts`
- [ ] 实现 `SessionFactory.ts` (含 Partition 和 setProxy 逻辑)
- [ ] 实现 `ViewManager.ts` (基于 WebContentsView)
- [ ] 移植 `preload/whatsapp.ts` (含 WA-JS 注入逻辑)
- [ ] 实现基础 IPC 监听 (`whatsapp:view-attach`, `whatsapp:view-detach`)

## Phase 3: 前端开发 (Frontend UI)
- [ ] 在 Vben 中添加 `/whatsapp` 路由模块
- [ ] 开发 `views/whatsapp/accounts/index.vue` (账号列表)
- [ ] 开发 `views/whatsapp/chat/index.vue` (含占位 div 和 useElementBounding)
- [ ] 定义 Pinia Store `useWhatsappStore`

## Phase 4: 联调与核心功能 (Integration)
- [ ] 联调：点击列表 -> 跳转路由 -> IPC 发送 -> 视图出现 (显示 Google 或 WA 首页)
- [ ] 联调：窗口缩放时，视图位置正确跟随
- [ ] 功能：实现添加账号流程 (输入 ID/代理 -> 写入 JSON -> 创建 Session)
- [ ] 功能：注入脚本生效，控制台能打印出 `WPP` 对象

## Phase 5: 完善与优化 (Polish)
- [ ] 登录状态同步 (二维码扫描 -> 登录成功 -> UI 变更为在线)
- [ ] 消息接收通知
- [ ] 侧边栏红点
- [ ] 生产环境构建测试 (`pnpm build`)

---

## 常用命令备忘

*   **启动开发环境**: `pnpm run dev:antd` (需确认已修改 script)
*   **构建**: `pnpm run build`
*   **Electron 日志**: 查看控制台输出，或 `apps/electron-main/logs` (如果配置了 logger)
