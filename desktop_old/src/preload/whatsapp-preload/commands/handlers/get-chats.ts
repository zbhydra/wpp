/**
 * 获取聊天命令处理器
 */

import { ipcRenderer, webFrame } from 'electron';
import { getAccountId } from '../../utils/account';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 处理获取聊天命令
 */
export async function handleGetChats(_params: any): Promise<void> {
  const accountId = getAccountId();

  try {
    // 检查 WPP 是否就绪
    const isReady = await webFrame.executeJavaScript('!!window.WPP?.isReady');
    if (!isReady) {
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(accountId), {
        error: 'WPP not ready',
        command: 'getChats',
      });
      return;
    }

    // 获取聊天列表
    const chats = await webFrame.executeJavaScript(`
      (function() {
        if (!window.WAPI?.getAllChats) {
          return [];
        }
        return window.WAPI.getAllChats();
      })()
    `);

    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.CHATS(accountId), { chats });
  } catch (error) {
    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(accountId), {
      error: error instanceof Error ? error.message : String(error),
      command: 'getChats',
    });
  }
}
