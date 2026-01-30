/**
 * WhatsApp API 模块
 * 暴露给渲染进程的安全 API
 * 所有 WPP/WAPI 访问都在页面上下文中执行
 */

import { webFrame } from 'electron';

/**
 * 暴露安全的 API 给页面
 */

export const whatsappAPI = {
  // 检查 WPP 是否就绪
  isReady: async () => {
    try {
      return await webFrame.executeJavaScript('!!window.WPP?.isReady');
    } catch {
      return false;
    }
  },

  // 发送消息
  sendMessage: async (to: string, message: string) => {
    // 转换为 JID 格式
    const jid = to.includes('@') ? to : `${to}@c.us`;

    const result = await webFrame.executeJavaScript(`
      (function() {
        if (!window.WPP?.chat?.sendTextMessage) {
          throw new Error('WPP.chat.sendTextMessage not available');
        }
        return window.WPP.chat.sendTextMessage(${JSON.stringify(jid)}, ${JSON.stringify(message)});
      })()
    `);
    return result;
  },

  // 获取所有联系人
  getContacts: async () => {
    try {
      return await webFrame.executeJavaScript(`
        (function() {
          if (!window.WAPI?.getAllContacts) {
            return [];
          }
          return window.WAPI.getAllContacts();
        })()
      `);
    } catch {
      return [];
    }
  },

  // 获取所有聊天
  getChats: async () => {
    try {
      return await webFrame.executeJavaScript(`
        (function() {
          if (!window.WAPI?.getAllChats) {
            return [];
          }
          return window.WAPI.getAllChats();
        })()
      `);
    } catch {
      return [];
    }
  },

  // 检查认证状态
  isAuthenticated: async () => {
    try {
      return await webFrame.executeJavaScript(`
        (function() {
          if (!window.WPP?.conn?.isAuthenticated) {
            return false;
          }
          return window.WPP.conn.isAuthenticated();
        })()
      `);
    } catch {
      return false;
    }
  },
}
