# Phase 4: WhatsApp 集成

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 4 - WhatsApp 集成（第 555-617 行）

## 目标

实现 WhatsApp Web 的集成，包括 WA-JS 注入和事件监听。

## 需要处理

### 1. 复制 WA-JS 资源

将 WA-JS 文件复制到项目中：
- 源路径：`../desktop_old/resources/wa-js/`（如果存在）
- 目标路径：`desktop/resources/wa-js/`

确保 WA-JS 文件可被主进程读取。

### 2. 实现 WhatsApp Preload 脚本

**文件**: `desktop/electron/preload/whatsapp/index.ts`

需要实现：
- 从 URL 参数获取 `accountId`
- 隐藏 Electron 特征（删除 window.process, window.require）
- 通过 IPC 获取 WA-JS 内容
- 使用 `webFrame.executeJavaScript` 注入 WA-JS
- 等待 WPP 就绪（轮询检查 window.WPP）
- 设置 WPP 事件监听：
  - `conn.authenticated` - 登录成功
  - `conn.disconnected` - 断开连接
- 通过 IPC 发送状态更新

### 3. 实现 WA-JS 内容读取 IPC

在主进程中添加 IPC 处理器：
- `wa-js:get-content` - 读取 WA-JS 文件内容并返回

### 4. 实现状态事件转发

在主进程中添加 WhatsApp 事件监听：
- `wa:login:{accountId}` - 登录成功
- `wa:logout:{accountId}` - 登出
- `wa:ready:{accountId}` - WPP 就绪
- `wa:error:{accountId}` - 错误

将这些事件转发到渲染进程。

### 5. 添加 WhatsApp 类型定义

**文件**: `desktop/electron/preload/whatsapp/types.ts`

定义 preload 脚本需要的类型。

## 验收标准

- [ ] WA-JS 文件正确复制到 resources 目录
- [ ] WhatsApp Preload 脚本实现完整
- [ ] 能成功注入 WA-JS 到 WhatsApp Web
- [ ] 能正确检测 WPP 就绪状态
- [ ] 事件监听正常工作（登录、登出、错误）
- [ ] 隐藏 Electron 特征，避免被 WhatsApp 检测

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-04.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 验证 WA-JS 资源 ==="
test -d resources/wa-js && echo "✅ wa-js 目录存在" || echo "❌ wa-js 目录不存在"
test -f resources/wa-js/wpp.js && echo "✅ wpp.js 存在" || echo "⚠️  wpp.js 不存在，请手动复制"

echo ""
echo "=== 验证 Preload 脚本 ==="
test -f electron/preload/whatsapp/index.ts && echo "✅ whatsapp preload 存在" || echo "❌ whatsapp preload 不存在"
test -f electron/preload/whatsapp/types.ts && echo "✅ whatsapp types 存在" || echo "❌ whatsapp types 不存在"

echo ""
echo "=== TypeScript 类型检查 ==="
cd electron
pnpm exec tsc --noEmit preload/whatsapp/*.ts 2>/dev/null && echo "✅ whatsapp preload 类型检查通过" || echo "❌ whatsapp preload 类型检查失败"
cd ..

echo ""
echo "=== 检查 IPC 处理器 ==="
grep -q "wa-js:get-content" electron/main/ipc/*.ts 2>/dev/null && echo "✅ wa-js IPC 处理器已注册" || echo "⚠️  请检查 IPC 注册"
```

## 预期结果

```
=== 验证 WA-JS 资源 ===
✅ wa-js 目录存在
✅ wpp.js 存在

=== 验证 Preload 脚本 ===
✅ whatsapp preload 存在
✅ whatsapp types 存在

=== TypeScript 类型检查 ===
✅ whatsapp preload 类型检查通过

=== 检查 IPC 处理器 ===
✅ wa-js IPC 处理器已注册
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| WA-JS 注入失败 | 检查文件路径，确保 IPC 正确返回内容 |
| WPP 就绪检测超时 | 增加超时时间或检查 WhatsApp Web 是否正常加载 |
| WhatsApp 检测到 Electron | 确保删除了所有 Electron 特征 |
| 事件监听不工作 | 检查 IPC 通道名称是否一致 |

## 测试建议

手动测试流程：
1. 启动应用
2. 创建一个 WhatsApp 账号
3. 等待二维码显示
4. 扫码登录
5. 检查控制台是否有登录事件

## 下一步

完成后继续：[Phase 5: 控制器层](./phase-05-controllers.md)
