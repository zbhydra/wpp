/**
 * WhatsApp Preload 类型定义
 */

/**
 * IPC 命令数据
 */
export interface CommandData {
  accountId: string;
  command: string;
  data: any;
}

/**
 * 发送消息命令参数
 */
export interface SendMessageParams {
  to: string;
  message: string;
}

/**
 * IPC 事件结果
 */
export interface IpcResult<T = any> {
  success: boolean;
  content?: T;
  error?: string;
}

/**
 * WPP 全局对象
 */
export interface WPPGlobal {
  isReady: boolean;
  conn: {
    isAuthenticated(): boolean;
    getMyUserId(): string;
  };
  waitFor(): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
}

/**
 * WAPI 全局对象
 */
export interface WAPIGlobal {
  sendText(to: string, message: string): Promise<any>;
  getAllContacts(): any[];
  getAllChats(): any[];
}

/**
 * Window 扩展类型
 */
declare global {
  interface Window {
    WPP?: WPPGlobal;
    WAPI?: WAPIGlobal;
  }
}
