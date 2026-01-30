/**
 * WhatsApp 事件监听器模块
 * 在页面上下文中设置 WPP 事件监听，通过 CustomEvent 通知 preload
 */

import { ipcRenderer, webFrame } from 'electron';
import { getAccountId } from '../utils/account';
import { fetchAndSendUserInfo } from './user-info-fetcher';
import { whatsappAPI } from '../api/whatsapp-api';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 在页面上下文中注入事件监听器
 * 这些监听器会通过 CustomEvent 通知 preload 上下文
 */
async function injectPageContextListeners(accountId: string): Promise<void> {
  console.log('[WA-JS] Injecting page context event listeners...');
  await webFrame.executeJavaScript(`
    (function() {
      if (!window.WPP) {
        console.error('[WA-JS] WPP not found in page context');
        return;
      }

      // 监听认证成功事件
      window.WPP.on('conn.authenticated', async () => {
        console.log('[WA-JS] User authenticated (page context)');
        // 通过 CustomEvent 通知 preload
        window.dispatchEvent(new CustomEvent('wa:login', {
          detail: { accountId: '${accountId}' }
        }));
      });

      // 监听断开连接事件
      window.WPP.on('conn.disconnected', () => {
        console.log('[WA-JS] User disconnected (page context)');
        window.dispatchEvent(new CustomEvent('wa:logout', {
          detail: { accountId: '${accountId}' }
        }));
      });

      // 监听新消息事件
      window.WPP.on('chat.new_message', (message) => {
        console.log('[WA-JS] New message received (page context)');
        window.dispatchEvent(new CustomEvent('wa:message:received', {
          detail: { accountId: '${accountId}', message }
        }));
      });

      console.log('[WA-JS] Page context event listeners registered');
    })()
  `);
  console.log('[WA-JS] Page context event listeners injected successfully');
}

/**
 * 设置 preload 上下文中的事件监听器
 * 监听来自页面上下文的 CustomEvent
 */
function setupPreloadListeners(accountId: string): void {
  // 监听登录事件
  window.addEventListener('wa:login', async (event: any) => {
    if (event.detail?.accountId === accountId) {
      console.log('[WA-JS] User authenticated event received');
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.LOGIN(accountId));
      await fetchAndSendUserInfo(accountId);
    }
  });

  // 监听登出事件
  window.addEventListener('wa:logout', (event: any) => {
    if (event.detail?.accountId === accountId) {
      console.log('[WA-JS] User disconnected event received');
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.LOGOUT(accountId));
    }
  });

  // 监听新消息事件
  window.addEventListener('wa:message:received', (event: any) => {
    if (event.detail?.accountId === accountId) {
      console.log('[WA-JS] New message event received');
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.MESSAGE_RECEIVED(accountId), { message: event.detail.message });
    }
  });
}


async function waitForWPPReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[WA-JS] Waiting for WPP to be ready...');
    let attempts = 0;
    const maxAttempts = 999999; // 30 seconds timeout

    const interval = setInterval(async () => {
      attempts++;
      const isReady = await whatsappAPI.isReady();
      console.log(`[WA-JS] WPP ready check ${attempts}/${maxAttempts}: ${isReady}`);

      if (isReady) {
        clearInterval(interval);
        console.log('[WA-JS] WPP is ready!');
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('[WA-JS] WPP ready timeout after 30 seconds');
        reject(new Error('WPP ready timeout'));
      }
    }, 1000);
  });
}
/**
 * 监听 WhatsApp 事件
 */
export async function setupWhatsAppEventListeners(): Promise<void> {
  try {
    // 等待 WPP 就绪
    await waitForWPPReady();

    const accountId = getAccountId();
    const isReady = await webFrame.executeJavaScript('!!window.WPP');

    if (!isReady) {
      console.error('[WA-JS] WPP not found');
      return;
    }

    // 检查是否已经登录（处理之前已登录的情况）
    const isAuthenticated = await webFrame.executeJavaScript(`
      (function() {
        return window.WPP?.conn?.isAuthenticated ? window.WPP.conn.isAuthenticated() : false;
      })()
    `);

    if (isAuthenticated) {
      console.log('[WA-JS] User already authenticated');
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.LOGIN(accountId));
      await fetchAndSendUserInfo(accountId);
    }

    // 在页面上下文中注入事件监听器
    await injectPageContextListeners(accountId);
    console.log('[WA-JS] injectPageContextListeners completed');

    // 在 preload 上下文中设置监听器
    setupPreloadListeners(accountId);
    console.log('[WA-JS] Preload context event listeners set up');

    // 通知主进程 WPP 已就绪
    console.log('[WA-JS] About to send READY event...');
    const readyChannel = WHATSAPP_WINDOW_CHANNELS.READY(accountId);
    console.log('[WA-JS] Ready channel:', readyChannel);
    console.log('[WA-JS] Sending READY event via IPC:', readyChannel);
    ipcRenderer.send(readyChannel);
    console.log('[WA-JS] READY event sent successfully');

    console.log('[WA-JS] Event listeners set up successfully');
  } catch (error) {
    console.error('[WA-JS] Failed to initialize WPP:', error);
    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(getAccountId()), {
      error: error instanceof Error ? error.message : 'WPP initialization failed',
    });
  }
}
