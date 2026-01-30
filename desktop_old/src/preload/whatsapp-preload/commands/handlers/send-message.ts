/**
 * 发送消息命令处理器
 */

import { ipcRenderer, webFrame } from 'electron';
import { SendMessageParams } from '../../types';
import { getAccountId } from '../../utils/account';
import { WHATSAPP_WINDOW_CHANNELS } from '@shared/ipc/channels';

/**
 * 将纯数字号码转换为 WhatsApp JID 格式
 * @param phoneNumber 纯数字号码，如 8613800138000
 * @returns JID 格式，如 8613800138000@c.us
 */
function toJid(phoneNumber: string): string {
  // 如果已经是 JID 格式，直接返回
  if (phoneNumber.includes('@')) {
    return phoneNumber;
  }
  // 否则添加 @c.us 后缀
  return `${phoneNumber}@c.us`;
}

/**
 * 处理发送消息命令
 */
export async function handleSendMessage(params: SendMessageParams): Promise<void> {
  const { to, message } = params;
  const accountId = getAccountId();

  try {
    // 检查 WPP 是否就绪
    const isReady = await webFrame.executeJavaScript('!!window.WPP?.isReady');
    if (!isReady) {
      ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(accountId), {
        error: 'WPP not ready',
        command: 'sendMessage',
      });
      return;
    }

    // 转换为 JID 格式
    const jid = toJid(to);

    // 使用 WPP.chat 发送消息
    const result = await webFrame.executeJavaScript(`
      (function() {
        if (!window.WPP?.chat?.sendTextMessage) {
          throw new Error('WPP.chat.sendTextMessage not available');
        }
        return window.WPP.chat.sendTextMessage(${JSON.stringify(jid)}, ${JSON.stringify(message)});
      })()
    `);

    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.MESSAGE_SENT(accountId), {
      to: jid,
      message,
      result,
    });
  } catch (error) {
    ipcRenderer.send(WHATSAPP_WINDOW_CHANNELS.ERROR(accountId), {
      error: error instanceof Error ? error.message : String(error),
      command: 'sendMessage',
    });
  }
}
