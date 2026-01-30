/**
 * 会话管理器基类
 * 为不同平台提供统一的会话持久化接口
 */
export abstract class BaseSessionManager<TSessionData = any> {
  /**
   * 获取所有账号 ID
   */
  abstract getAccounts(): string[];

  /**
   * 获取指定账号的会话信息
   */
  abstract getAccount(accountId: string): TSessionData | null;

  /**
   * 保存会话信息
   */
  abstract saveSession(accountId: string, name: string, tokens: any): void;

  /**
   * 保存账号元数据（不包含 tokens）
   */
  abstract saveAccount(accountId: string, name: string): void;

  /**
   * 删除会话
   */
  abstract deleteSession(accountId: string): void;

  /**
   * 重命名账号
   */
  abstract renameAccount(accountId: string, newName: string): void;

  /**
   * 获取 token 文件路径
   */
  abstract getTokenPath(accountId: string): string;
}
