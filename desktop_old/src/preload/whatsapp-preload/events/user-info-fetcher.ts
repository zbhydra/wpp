/**
 * 用户信息获取模块
 */

import { webFrame } from 'electron';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 获取用户信息并发送到主进程
 * 在页面上下文中获取 WPP 用户信息
 */
export async function fetchAndSendUserInfo(accountId: string): Promise<void> {
  try {
    const userInfo = await webFrame.executeJavaScript(`
      (function() {
        if (!window.WPP?.conn?.getMyUserId) {
          return null;
        }
        return window.WPP.conn.getMyUserId();
      })()
    `);

    if (userInfo) {
      console.log('[WA-JS] User info:', userInfo);
      // 通过 IPC 发送用户信息
      const { ipcRenderer } = require('electron');
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.USER_INFO(accountId), { userInfo });
    }
  } catch (error) {
    console.error('[WA-JS] Failed to get user info:', error);
  }
}
