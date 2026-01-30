/**
 * WhatsApp 账号 API
 */

import type { HTTPClient } from './client';
import type {
  WhatsAppAccount,
  CreateAccountRequest,
  CreateAccountResponse,
  UpdateAccountRequest,
} from '../types';

export class AccountAPI {
  constructor(private client: HTTPClient) {}

  /**
   * 获取账号列表
   */
  async getAccounts(): Promise<WhatsAppAccount[]> {
    return this.client.get<WhatsAppAccount[]>('/whatsapp-accounts');
  }

  /**
   * 获取账号详情
   */
  async getAccount(accountId: string): Promise<WhatsAppAccount> {
    return this.client.get<WhatsAppAccount>(`/whatsapp-accounts/${accountId}`);
  }

  /**
   * 创建账号
   */
  async createAccount(data: CreateAccountRequest): Promise<CreateAccountResponse> {
    return this.client.post<CreateAccountResponse>('/whatsapp-accounts', data);
  }

  /**
   * 更新账号
   */
  async updateAccount(accountId: string, data: UpdateAccountRequest): Promise<void> {
    await this.client.put<void>(`/whatsapp-accounts/${accountId}`, data);
  }

  /**
   * 删除账号
   */
  async deleteAccount(accountId: string): Promise<void> {
    await this.client.delete<void>(`/whatsapp-accounts/${accountId}`);
  }
}
