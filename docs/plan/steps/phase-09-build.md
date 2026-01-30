# Phase 9: 打包部署

## 对应计划

- **文档**: [002. 实施计划](./claude-glm-reborn-002-implementation.md)
- **章节**: Phase 9 - 打包部署（第 1127-1219 行）

## 目标

配置 electron-builder，实现应用打包，支持 Windows、macOS、Linux 平台。

## 需要处理

### 1. 配置 electron-builder

**文件**: `desktop/electron-builder.json`

需要配置：
- 应用信息：
  - `appId`: com.wppmanager.app
  - `productName`: WPP Manager
- 目录结构：
  - `output`: release（输出目录）
  - `buildResources`: resources（资源目录）
- 包含文件：
  - `dist/**/*`（Electron 主进程）
  - `apps/web-antd/dist/**/*`（渲染进程）
- Windows 配置：
  - 目标：nsis
  - 图标：resources/icons/icon.ico
- macOS 配置：
  - 目标：dmg
  - 图标：resources/icons/icon.icns
  - 分类：public.app-category.productivity
  - 签名配置（如有）
- Linux 配置：
  - 目标：AppImage, deb
  - 图标：resources/icons
  - 分类：Utility

### 2. 创建构建脚本

**文件**: `desktop/scripts/electron/build.ts`

需要实现：
1. 构建 vben 应用
   - 运行 `pnpm build --filter=@vben/web-antd`
2. 构建 Electron 主进程
   - 运行 `pnpm --filter @wpp/electron build`
3. 使用 electron-builder 打包
   - 根据平台打包对应格式

### 3. 添加构建命令

在 `desktop/package.json` 中添加：
```json
{
  "scripts": {
    "build:app": "pnpm build:electron && electron-builder",
    "build:app:win": "pnpm build:app --win",
    "build:app:mac": "pnpm build:app --mac",
    "build:app:linux": "pnpm build:app --linux",
    "build:app:all": "pnpm build:app --win --mac --linux"
  }
}
```

### 4. 准备应用图标

创建图标文件：
- Windows: `resources/icons/icon.ico` (256x256)
- macOS: `resources/icons/icon.icns` (1024x1024)
- Linux: `resources/icons/` (PNG, 512x512)

可以使用在线工具或 electron-icon-builder 生成。

### 5. 配置应用签名（可选，macOS 必需）

**macOS**: 配置代码签名
```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  }
}
```

**Windows**: 配置签名（如有证书）
```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

### 6. 创建发布说明模板

**文件**: `desktop/RELEASE_TEMPLATE.md`

包含：
- 版本号
- 发布日期
- 更新内容
- 已知问题
- 下载链接

### 7. 配置自动更新（可选）

使用 electron-updater：
- 配置更新服务器
- 在应用中检查更新
- 下载并安装更新

## 验收标准

- [ ] electron-builder 配置正确
- [ ] Windows 打包成功，安装后能正常运行
- [ ] macOS 打包成功，安装后能正常运行
- [ ] Linux 打包成功，安装后能正常运行
- [ ] 应用图标正确显示
- [ ] 应用名称正确
- [ ] 无控制台错误

## 验证脚本

```bash
#!/bin/bash
# 保存为 verify-phase-09.sh

cd /Users/lxl/Documents/ljr/project/wpp/desktop

echo "=== 检查配置文件 ==="
test -f electron-builder.json && echo "✅ electron-builder.json 存在" || echo "❌ electron-builder.json 不存在"
test -f scripts/electron/build.ts && echo "✅ build.ts 存在" || echo "❌ build.ts 不存在"

echo ""
echo "=== 检查应用图标 ==="
test -f resources/icons/icon.png && echo "✅ icon.png 存在" || echo "⚠️  icon.png 不存在"
test -f resources/icons/icon.ico && echo "✅ icon.ico 存在" || echo "⚠️  icon.ico 不存在"
test -f resources/icons/icon.icns && echo "✅ icon.icns 存在" || echo "⚠️  icon.icns 不存在"

echo ""
echo "=== 检查构建脚本 ==="
grep -q "build:app" package.json && echo "✅ build:app 脚本存在" || echo "❌ build:app 脚本不存在"
grep -q "build:app:win" package.json && echo "✅ build:app:win 脚本存在" || echo "❌ build:app:win 脚本不存在"
grep -q "build:app:mac" package.json && echo "✅ build:app:mac 脚本存在" || echo "❌ build:app:mac 脚本不存在"

echo ""
echo "=== 验证构建（当前平台） ==="
pnpm build:app 2>&1 | tail -20

echo ""
echo "=== 检查输出 ==="
test -d release && echo "✅ release 目录存在" || echo "❌ release 目录不存在"
ls -lh release/ 2>/dev/null || echo "无构建输出"
```

## 预期结果

```
=== 检查配置文件 ===
✅ electron-builder.json 存在
✅ build.ts 存在

=== 检查应用图标 ===
✅ icon.png 存在
✅ icon.ico 存在
✅ icon.icns 存在

=== 检查构建脚本 ===
✅ build:app 脚本存在
✅ build:app:win 脚本存在
✅ build:app:mac 脚本存在

=== 验证构建（当前平台） ===
  • electron-builder  version=25.0.0 os=23.0.0
  • building        target=mac zip arch=x64
  • building        target=dmg arch=x64
  • building        target=blockmap arch=x64

=== 检查输出 ===
✅ release 目录存在
WPP Manager-1.0.0.dmg
WPP Manager-1.0.0-mac.zip
```

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 构建失败 | 检查 dist 目录是否存在，确保先构建应用 |
| 图标不显示 | 检查图标路径和格式 |
| macOS 无法打开 | 检查代码签名，或允许来自未知开发者的应用 |
| Windows 警告 | 使用代码签名证书 |
| 文件太大 | 检查是否包含了不必要的文件 |

## 打包命令

```bash
# 打包当前平台
pnpm build:app

# 打包 Windows
pnpm build:app:win

# 打包 macOS
pnpm build:app:mac

# 打包 Linux
pnpm build:app:linux

# 打包所有平台
pnpm build:app:all
```

## 发布流程

1. 更新版本号
2. 运行构建命令
3. 测试安装包
4. 上传到发布平台
5. 创建 GitHub Release
6. 通知用户更新

## 完成

🎉 **恭喜！所有 9 个 Phase 已完成！**

WPP Manager 现在可以打包发布了。

## 相关文档

- [架构设计](../claude-glm-reborn-001-architecture.md)
- [核心需求](../claude-glm-reborn-core-requirements.md)
- [原实施计划](../claude-glm-reborn-002-implementation.md)
