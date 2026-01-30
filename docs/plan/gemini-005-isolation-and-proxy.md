# 005. 隔离性与代理实现深度解析 (Isolation & Proxy)

本项目的核心竞争力在于“多账号完全隔离”。本章节详细说明如何从技术底层保证这一点。

## 1. Partition (分区) 机制详解

Electron 的 `WebContents` 都有一个关联的 `Session`。
如果不指定 `partition`，所有窗口共享默认 Session (Cache, Cookies, Storage)。

### 1.1 命名规范
我们使用 `persist:` 前缀，格式为 `persist:wa_{accountId}`。
*   `persist:`: 告诉 Electron 将数据写入磁盘 (UserData 目录)，而不是仅保存在内存中。程序重启后，登录态依然存在。
*   `wa_{accountId}`: 唯一的标识符。

### 1.2 磁盘存储验证
在开发模式下，你可以检查以下路径来验证隔离是否生效：
`~/Library/Application Support/wpp-manager/Partitions/` (macOS)
在该目录下，你应该能看到：
*   `persist:wa_user_001`
*   `persist:wa_user_002`
*   ...

每个文件夹内都有独立的 `Network/Cookies`, `Local Storage`, `Cache` 文件夹。

## 2. 代理 (Proxy) 深度实现

### 2.1 为什么需要在 Session 层设置？
如果在 Chromium 启动参数 (`--proxy-server`) 设置，它是全局的，所有账号都会走同一个代理。
只有在 `Session` 对象上调用 `setProxy`，才能实现**每个账号不同代理**。

### 2.2 动态切换代理
用户可能在运行时修改代理配置。

```typescript
// AccountManager.ts

async function updateAccountProxy(accountId: string, newProxyUrl: string) {
    // 1. 获取该账号当前的 Session
    const sess = session.fromPartition(`persist:wa_${accountId}`);
    
    // 2. 实时应用新代理
    await sess.setProxy({
        proxyRules: newProxyUrl, // e.g., "http=127.0.0.1:8080;https=127.0.0.1:8080"
        proxyBypassRules: 'localhost,127.0.0.1'
    });
    
    // 3. 强制刷新当前视图以应用新连接
    const view = viewManager.getView(accountId);
    if (view) {
        view.webContents.reload();
    }
    
    // 4. 验证 IP (可选)
    // 可以在 webContents 执行一段 JS 请求 https://api.ipify.org 查看当前 IP
}
```

### 2.3 代理认证 (用户名/密码)
如果代理需要认证，需要监听 `login` 事件。

```typescript
// Main.ts

app.on('login', (event, webContents, request, authInfo, callback) => {
  event.preventDefault();
  
  // 根据 webContents 找到对应的 accountId
  // 提示：可以在创建 view 时，view.webContents.setUserData('accountId', id)
  
  const accountId = getAccountIdByWebContents(webContents);
  const proxyConfig = accountManager.getProxyConfig(accountId);
  
  if (authInfo.isProxy && proxyConfig && proxyConfig.username) {
    callback(proxyConfig.username, proxyConfig.password);
  } else {
    // 或者是空，或者是取消
    callback('', '');
  }
});
```

## 3. 防关联 (Anti-Fingerprinting)

除了 IP 和 Cookie 隔离，为了防止 WhatsApp 通过指纹识别出所有账号运行在同一台机器上，我们需要做更多混淆。

### 3.1 User-Agent 随机化
在 `SessionFactory` 创建 Session 时，可以为每个 Session 设置略微不同的 UA 版本号（保持大版本一致，微调小版本）。

### 3.2 WebGL/Canvas 指纹
这比较高阶。如果需要，可以通过 preload 脚本覆盖 `HTMLCanvasElement.prototype.toDataURL`，在生成的图像数据中加入微小的随机噪点。

### 3.3 隐藏 Electron 特征
这已经在 `desktop_old` 的 preload 中实现。
*   删除 `window.process`
*   删除 `window.require`
*   修改 `navigator.webdriver` = `false`

## 4. 测试方案

1.  **IP 测试**：
    创建账号 A (代理 1) 和账号 B (代理 2)。
    分别让它们访问 `https://ipinfo.io` (这需要能在 BrowserView 中手动输入 URL，或者暂时通过代码 loadURL 测试)。
    确认显示的 IP 不同。

2.  **Cookie 测试**：
    账号 A 登录 WhatsApp。
    账号 B 打开 WhatsApp，应该是未登录状态 (二维码)。
    重启应用，账号 A 依然保持登录。

**下一步**：阅读 `gemini-006-migration-checklist.md`，开始动手。
