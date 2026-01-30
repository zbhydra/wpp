/**
 * 消息历史 API
 */

import type { HTTPClient } from './client';
import type {
  MessageRecord,
  SendMessageResult,
  CreateMessageRequest,
  CreateMessageResponse,
} from '../types';

export class MessageAPI {
  constructor(private client: HTTPClient) {}

  /**
   * 获取账号的消息历史
   */
  async getMessageHistory(accountId: string): Promise<MessageRecord[]> {
    return this.client.get<MessageRecord[]>(`/whatsapp-accounts/${accountId}/messages`);
  }

  /**
   * 创建消息记录（待发送状态）
   */
  async createMessage(accountId: string, data: CreateMessageRequest): Promise<CreateMessageResponse> {
    return this.client.post<CreateMessageResponse>(`/whatsapp-accounts/${accountId}/messages`, data);
  }

  /**
   * 更新消息状态
   */
  async updateMessageStatus(
    accountId: string,
    messageId: string,
    result: SendMessageResult
  ): Promise<void> {
    await this.client.patch<void>(`/whatsapp-accounts/${accountId}/messages/${messageId}`, {
      status: result.success ? 3 : 4, // 3=成功, 4=失败
      error_message: result.error,
      sent_at: result.timestamp,
    });
  }

  /**
   * 删除消息记录
   */
  async deleteMessage(accountId: string, messageId: string): Promise<void> {
    await this.client.delete<void>(`/whatsapp-accounts/${accountId}/messages/${messageId}`);
  }

  /**
   * 清空账号的消息历史
   */
  async clearMessageHistory(accountId: string): Promise<void> {
    await this.client.delete<void>(`/whatsapp-accounts/${accountId}/messages`);
  }
}
