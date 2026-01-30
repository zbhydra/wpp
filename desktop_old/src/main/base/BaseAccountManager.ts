import { Account, AccountStatus } from '../types';

/**
 * 账号管理器基类
 * 为不同平台（WhatsApp, Telegram, Signal 等）提供统一的账号管理接口
 */
export abstract class BaseAccountManager<TAccount = Account> {
  protected accounts: Map<string, TAccount> = new Map();

  /**
   * 获取所有账号列表
   */
  abstract getAccounts(): TAccount[];

  /**
   * 创建新账号
   */
  abstract createAccount(name: string): Promise<string>;

  /**
   * 启动账号
   */
  abstract startAccount(accountId: string): Promise<void>;

  /**
   * 停止账号
   */
  abstract stopAccount(accountId: string): Promise<void>;

  /**
   * 删除账号
   */
  abstract deleteAccount(accountId: string): Promise<void>;

  /**
   * 重命名账号
   */
  abstract renameAccount(accountId: string, newName: string): Promise<void>;

  /**
   * 更新账号状态
   */
  protected updateAccountStatus(
    accountId: string,
    status: AccountStatus,
    error?: string
  ): void {
    const account = this.accounts.get(accountId) as any;
    if (account) {
      account.status = status;
      if (error) {
        account.error = error;
      } else {
        delete account.error;
      }
    }
  }

  /**
   * 清理所有资源
   */
  abstract cleanup(): Promise<void>;
}
