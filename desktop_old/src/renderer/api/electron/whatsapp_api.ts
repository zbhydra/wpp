/**
 * WhatsApp Electron API
 * 封装 Electron 原生 WhatsApp 操作
 */

import type { SendMessageResult } from '../types';

/**
 * Electron API 接口（从 preload 暴露的接口）
 */
interface ElectronAPI {
  // WhatsApp 命令
  sendWhatsAppCommand(accountId: string, command: string, data?: any): Promise<any>;

  // 事件订阅
  onAccountsUpdate(callback: (accounts: any[]) => void): () => void;
}

/**
 * WhatsApp Electron API 类
 */
export class WhatsAppElectronAPI {
  private api: ElectronAPI;

  constructor() {
    if (!window.electronAPI) {
      throw new Error('electronAPI is not available. Make sure you are running in Electron environment.');
    }
    this.api = window.electronAPI as ElectronAPI;
  }

  /**
   * 启动账号
   */
  async startAccount(accountId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.api.sendWhatsAppCommand(accountId, 'start');
  }

  /**
   * 停止账号
   */
  async stopAccount(accountId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.api.sendWhatsAppCommand(accountId, 'stop');
  }

  /**
   * 发送消息
   */
  async sendMessage(accountId: string, to: string, message: string): Promise<SendMessageResult> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.api.sendWhatsAppCommand(accountId, 'sendMessage', { to, message });
  }

  /**
   * 获取联系人列表
   */
  async getContacts(accountId: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.api.sendWhatsAppCommand(accountId, 'getContacts');
  }

  /**
   * 获取聊天列表
   */
  async getChats(accountId: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.api.sendWhatsAppCommand(accountId, 'getChats');
  }

  /**
   * 获取账号 QR 码
   */
  async getQRCode(accountId: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.api.sendWhatsAppCommand(accountId, 'getQRCode');
  }

  /**
   * 订阅账号列表更新
   */
  onAccountsUpdate(callback: (accounts: any[]) => void): () => void {
    return this.api.onAccountsUpdate(callback);
  }
}
