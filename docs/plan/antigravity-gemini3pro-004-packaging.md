# 打包与构建配置 (004)

## 1. Electron-Builder 配置
复用 `desktop_old/electron-builder.yml` 或 `package.json` 中的构建配置，但需注意目录路径的变化。

**关键调整**:
- `directories.output`: 保持 `release/${version}`。
- `files`: 需包含 Vben 的构建产物 (通常在 `apps/web/dist` 或 `dist`) 和 Electron 的编译产物 (`dist-electron`)。
- `extraResources`: 确保 `patches` 或其他静态资源被正确打包（如果运行时需要）。

**配置示例**:
```json
"build": {
  "appId": "com.wpp.manager",
  "productName": "WPP Manager",
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "extraResources": [
    {
      "from": "assets",
      "to": "assets"
    }
  ]
}
```

## 2. 跨平台构建脚本
`desktop_old` 已经有了完善的构建脚本 (`build:win`, `build:mac` 等)，直接移植到 `desktop/package.json` 中。

## 3. CI/CD (可选)
如果 `desktop_old` 有 `.github/workflows`，也应一并迁移，确保自动化构建流程一致。

## 4. 签名与公证
如果旧项目有签名配置 (CSC_LINK, Apple ID 等)，需要确保新项目的环境变量 (.env) 中包含这些机密信息。
