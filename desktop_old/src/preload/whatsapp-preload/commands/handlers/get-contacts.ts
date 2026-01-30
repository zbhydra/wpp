/**
 * 获取联系人命令处理器
 */

import { ipcRenderer, webFrame } from 'electron';
import { getAccountId } from '../../utils/account';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 处理获取联系人命令
 */
export async function handleGetContacts(_params: any): Promise<void> {
  const accountId = getAccountId();

  try {
    // 检查 WPP 是否就绪
    const isReady = await webFrame.executeJavaScript('!!window.WPP?.isReady');
    if (!isReady) {
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(accountId), {
        error: 'WPP not ready',
        command: 'getContacts',
      });
      return;
    }

    // 获取联系人
    const contacts = await webFrame.executeJavaScript(`
      (function() {
        if (!window.WAPI?.getAllContacts) {
          return [];
        }
        return window.WAPI.getAllContacts();
      })()
    `);

    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.CONTACTS(accountId), { contacts });
  } catch (error) {
    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(accountId), {
      error: error instanceof Error ? error.message : String(error),
      command: 'getContacts',
    });
  }
}
