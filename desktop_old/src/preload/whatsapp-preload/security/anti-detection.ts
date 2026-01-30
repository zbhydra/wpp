/**
 * Electron 特征隐藏模块
 * 伪装成 Chrome 浏览器
 */

/**
 * 隐藏 Electron 特征
 * 必须在页面加载前执行
 */
export function hideElectronFeatures(): void {
  // 删除 Electron 相关的全局对象
  delete (window as any).require;
  delete (window as any).process;
  delete (window as any).global;

  // 修改 navigator 对象，使其看起来像 Chrome
  Object.defineProperty(navigator, 'userAgent', {
    get: () =>
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.',
  });

  Object.defineProperty(navigator, 'platform', {
    get: () => 'MacIntel',
  });

  Object.defineProperty(navigator, 'product', {
    get: () => 'Gecko',
  });

  // 隐藏 webdriver 标志
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
  });

  // 添加 Chrome 特有的插件
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      return {
        length: 3,
        0: {
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format',
        },
        1: {
          name: 'Chrome PDF Viewer',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
          description: '',
        },
        2: {
          name: 'Native Client',
          filename: 'internal-nacl-plugin',
          description: '',
        },
      };
    },
  });

  // 添加 Chrome 特有的权限
  if (navigator.permissions) {
    navigator.permissions.query = (name: string) =>
      Promise.resolve({
        state: 'granted',
        onchange: null,
      } as PermissionStatus);
  }

  console.log('[WA-JS] Electron features hidden');
}
