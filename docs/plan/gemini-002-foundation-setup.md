# 002. 基础设施搭建与清理 (Foundation Setup)

本阶段目标是将 `vue-vben-admin-electron-v5` 改造为一个干净的、适合开发 WPP 的底座。

## 1. 初始化项目目录

### 1.1 迁移代码库
我们将使用 `vue-vben-admin-electron-v5` 作为基础，将其内容移动到你指定的 `desktop` 目录中。

**操作步骤**：
1.  将 `vue-vben-admin-electron-v5` 下的所有文件移动到 `desktop/`。
2.  后续所有操作均在 `desktop/` 目录下进行。

### 1.2 清理 Vben 演示代码

Vben v5 包含大量演示应用（naive, ele, playground），我们需要精简。

### 1.3 移除不必要的 Apps
保留 `apps/web-antd` 作为我们的主要 UI 前端（Ant Design Vue 社区资源最丰富，适合管理后台）。
保留 `apps/backend-mock` (暂时保留，用于模拟登录接口，后期用 Python 后端替代)。

**删除以下目录**（在文件管理器中操作）：
*   `apps/web-ele`
*   `apps/web-naive`
*   `apps/web-tdesign`
*   `playground` (注意：原始的 electron 代码在这里，我们需要先提取出来，再删除)

### 1.2 创建独立的 Electron 主进程包

原项目的 Electron 主进程代码混在 `playground` 里，这不符合生产规范。我们需要在 `apps` 下创建一个独立的 `electron-main` 包。

**操作步骤**：
1.  在 `apps/` 下新建文件夹 `electron-main`。
2.  初始化 `apps/electron-main/package.json`：
    ```json
    {
      "name": "@wpp/electron-main",
      "version": "1.0.0",
      "main": "dist/main.js",
      "scripts": {
        "build": "tsc",
        "dev": "tsc -w"
      },
      "dependencies": {
        "electron-store": "^8.1.0",
        "fs-extra": "^11.1.1"
      }
    }
    ```
3.  将 `playground/electron` 下的所有内容（`main.ts`, `preload.ts` 等）移动到 `apps/electron-main/src`。

## 2. 调整构建配置

Vben 使用 `internal/vite-config` 来管理构建。我们需要修改配置，让它指向我们新的 `apps/electron-main` 目录，而不是 `playground`。

### 2.1 修改 `apps/web-antd/vite.config.mts`

找到集成 `vite-plugin-electron` 的地方，修改入口路径。

```typescript
// apps/web-antd/vite.config.mts (伪代码示意)
import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        // 配置 Electron 插件
        electron({
          entry: '../electron-main/src/main.ts', // 指向新的入口
          onstart(options) {
            options.startup(); // 启动 Electron
          },
        }),
      ],
    },
  };
});
```

*(注意：具体配置需参考 `internal/vite-config/src/plugins/electron.ts`，可能需要直接修改该插件的默认路径)*

## 3. 依赖安装与环境重置

1.  **清理依赖**：
    ```bash
    rm -rf node_modules
    rm pnpm-lock.yaml
    ```
2.  **修改根目录 `pnpm-workspace.yaml`**：
    确保包含 `apps/electron-main`。
    ```yaml
    packages:
      - 'apps/*'
      - 'packages/*'
      - 'internal/*'
      - '!**/test/**'
    ```
3.  **重新安装**：
    ```bash
    pnpm install
    ```

## 4. 验证环境

运行 `pnpm run dev:antd` (假设我们在 package.json 中把启动命令改为了启动 web-antd + electron)。
确保 Electron 窗口启动，并加载了 Vben 的登录页。

---

## 5. 项目结构最终形态

完成本阶段后，文件结构应如下：

```
/
├── apps/
│   ├── electron-main/       # [核心] 存放所有 Node.js 主进程代码
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   └── ...
│   │   └── package.json
│   ├── web-antd/            # [核心] 存放 Vue 渲染进程代码
│   │   ├── src/
│   │   │   ├── views/whatsapp/
│   │   │   └── ...
│   │   └── vite.config.mts
│   └── backend-mock/        # [暂存]
├── packages/                # Vben 共享库 (保持原样)
├── internal/                # 构建工具 (保持原样)
└── pnpm-workspace.yaml
```

**下一步**：阅读 `gemini-003-backend-integration.md`，开始移植核心业务逻辑。
