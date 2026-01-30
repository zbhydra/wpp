/**
 * WaJS 注入模块
 */

import { ipcRenderer, webFrame } from 'electron';
import { IpcResult } from '../types';
import { getAccountId } from '../utils/account';
import { setupWhatsAppEventListeners } from '../events/whatsapp-event-listener';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 实际注入脚本 - 使用 webFrame.executeJavaScript 绕过 CSP
 */
async function doInjectWaJS(): Promise<void> {
  console.log('[WA-JS] Starting script injection using webFrame...');

  try {
    // 通过 IPC 从主进程读取 wa-js 文件内容
    const waJsResult = (await ipcRenderer.invoke('wa-js:read-file', 'wa.js')) as IpcResult<string>;
    if (!waJsResult.success) {
      throw new Error(`Failed to read wa.js: ${waJsResult.error}`);
    }
    const waJsContent = waJsResult.content!;
    console.log('[WA-JS] wa.js file read, size:', waJsContent.length);

    // 通过 IPC 从主进程读取 wapi 文件内容
    const wapiResult = (await ipcRenderer.invoke('wa-js:read-file', 'wapi.js')) as IpcResult<string>;
    if (!wapiResult.success) {
      throw new Error(`Failed to read wapi.js: ${wapiResult.error}`);
    }
    const wapiContent = wapiResult.content!;
    console.log('[WA-JS] wapi.js file read, size:', wapiContent.length);

    // 使用 webFrame.executeJavaScript 在页面上下文中执行代码
    // 这个方法会绕过 CSP，因为它是在 Isolated World 中执行的
    await webFrame.executeJavaScript(waJsContent);
    console.log('[WA-JS] wa.js executed successfully');

    await webFrame.executeJavaScript(wapiContent);
    console.log('[WA-JS] wapi.js executed successfully');

    // 脚本注入完成后，设置 WhatsApp 事件监听
    console.log('[WA-JS] Scripts injected, setting up event listeners...');
    setupWhatsAppEventListeners();
  } catch (error) {
    console.error('[WA-JS] Failed to inject scripts:', error);
    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(getAccountId()), {
      error: error instanceof Error ? error.message : String(error),
      details: error,
    });
  }
}

/**
 * 注入 wa-js 脚本
 * 在 DOMContentLoaded 时注入，避免与 WhatsApp 的 IndexedDB 初始化冲突
 */
export function injectWaJS(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 短暂延迟，确保 DOM 完全准备好
      setTimeout(() => doInjectWaJS(), 100);
    });
  } else {
    // DOM 已经准备好
    setTimeout(() => doInjectWaJS(), 100);
  }
}
