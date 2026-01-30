/**
 * 命令监听器模块
 */

import { ipcRenderer } from 'electron';
import { CommandData } from '../types';
import { getAccountId } from '../utils/account';
import { commandHandlers } from './index';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 设置命令监听器
 */
export function setupCommandListener(): void {
  ipcRenderer.on(WHATSAPP_WINDOW_CHANNELS.COMMAND, async (event, payload: CommandData) => {

    console.log(event);
    console.log(payload);

    const { accountId, command, data: params } = payload;

    // 只处理属于当前账号的命令
    if (accountId !== getAccountId()) {
      return;
    }

    console.log('[WA-JS] Received command:', command, params);

    // 获取对应的命令处理器
    const handler = commandHandlers[command];
    if (handler) {
      // 处理器可能是异步的
      await handler(params);
    } else {
      console.warn('[WA-JS] Unknown command:', command);
    }
  });
}
