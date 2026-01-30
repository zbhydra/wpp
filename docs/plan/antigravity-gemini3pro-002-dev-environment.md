# 开发环境搭建 (002)

## 1. 项目初始化
由于 `desktop` 是空目录，我们需要先初始化 Vben Admin。

```bash
# 在项目根目录执行
cd desktop
# 克隆 Vben 5 (推荐使用 degit 或直接 clone 官方仓库)
git clone https://github.com/vbenjs/vue-vben-admin.git .
# 切换到 main 分支 (默认即是)
```

## 2. 依赖安装与清理
Vben 是一个 Monorepo，但我们将简化它用于 Electron 项目。

### 清理 (可选)
如果不需要 Vben 的文档站、Playground 等 monorepo 包，可以适当精简 `apps` 目录，只保留主应用。但为了保持更新方便，建议保留原结构。

### 安装 Electron 依赖
在根目录 (`desktop/`) 下安装：

```bash
# 核心依赖 (与 desktop_old 对齐版本)
pnpm add -D electron@33.2.1 
# 注意: desktop_old 用的是 Electron 39 (beta?) 这看起来像版本号错误，Electron 最新稳定版约 v34。
# 我们以 desktop_old 的 package.json 为准，或者选择最新的稳定版 v33/v34。
# 修正: desktop_old package.json 显示 "electron": "^39.2.7" -> 这极不可能是真实的 Electron 版本。
# Electron 目前最新大约是 v34。可能是 Fork 版本或者笔误。
# 建议使用最新的稳定版 Electron v33。

pnpm add -D electron@latest
pnpm add -D vite-plugin-electron vite-plugin-electron-renderer electron-builder
pnpm add -D rimraf
```

### 移植 Patches
`desktop_old` 使用了 `patches/qrcode-terminal@0.12.0.patch`。
我们需要将 `desktop_old/patches` 目录复制到 `desktop/patches`，并在 `desktop/package.json` 中配置 `pnpm.patchedDependencies`。

```json
// desktop/package.json
{
  "pnpm": {
    "patchedDependencies": {
      "qrcode-terminal@0.12.0": "patches/qrcode-terminal@0.12.0.patch"
    }
  }
}
```

## 3. 配置 Electron 构建
修改 `desktop/apps/web/vite.config.ts` (假设应用在 apps/web) 或根目录配置，注入 Electron 插件。

**关键点**: Vben 5 使用 TurboRepo 和 pnpm workspace。我们需要确保 Electron 构建脚本能正确找到入口。

建议在 `desktop` 根目录创建 `electron` 文件夹存放主进程代码，并在根目录 `package.json` 添加脚本：

```json
{
  "scripts": {
    "dev:electron": "pnpm -F @vben/web dev", 
    "build:electron": "pnpm -F @vben/web build && electron-builder"
  }
}
```
*注: 具体脚本需根据 Vben 5 的 monorepo 结构微调。Vben 5 的主应用通常在 `apps/web-antd` 或类似路径。*

## 4. 环境变量
复制 `desktop_old/.env.development` 中的关键变量（如有）到 Vben 的 `.env` 文件中。
主要关注后端 API 地址配置：`VITE_GLOB_API_URL`。

## 5. 验证环境
运行 `pnpm install` 确保所有依赖（包括 patch）安装正确。
