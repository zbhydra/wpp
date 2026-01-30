/**
 * 命令路由器
 * 集中管理所有命令处理器
 */

import { handleSendMessage } from './handlers/send-message';
import { handleGetContacts } from './handlers/get-contacts';
import { handleGetChats } from './handlers/get-chats';

/**
 * 命令处理器类型（异步）
 */
export type CommandHandler = (params: any) => void | Promise<void>;

/**
 * 命令处理器映射表
 */
export const commandHandlers: Record<string, CommandHandler> = {
  sendMessage: handleSendMessage,
  getContacts: handleGetContacts,
  getChats: handleGetChats,
};
