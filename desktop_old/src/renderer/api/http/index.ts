/**
 * HTTP API 统一导出
 */

export { HTTPClient, HTTPError } from './client';
export { AuthAPI } from './auth_api';
export { AccountAPI } from './account_api';
export { MessageAPI } from './message_api';

import { HTTPClient } from './client';
import { AuthAPI } from './auth_api';
import { AccountAPI } from './account_api';
import { MessageAPI } from './message_api';

/**
 * HTTP API 实例
 */
class HTTPAPIs {
  private client: HTTPClient;
  auth: AuthAPI;
  accounts: AccountAPI;
  messages: MessageAPI;

  constructor() {
    this.client = new HTTPClient();
    this.auth = new AuthAPI(this.client);
    this.accounts = new AccountAPI(this.client);
    this.messages = new MessageAPI(this.client);
  }

  // ==================== 核心 Token 管理 ====================
  setToken(token: string | null) {
    this.client.setToken(token);
  }

  getToken(): string | null {
    return this.client.getToken();
  }

  setRefreshToken(token: string, expiresInSeconds: number) {
    this.client.setRefreshToken(token, expiresInSeconds);
  }

  getRefreshToken(): string | null {
    return this.client.getRefreshToken();
  }

  clearRefreshTimer() {
    this.client.clearRefreshTimer();
  }
}

export const httpApi = new HTTPAPIs();
