/**
 * 统一存储接口定义
 * 定义了所有存储后端需要实现的方法
 */

// ============================================
// 类型定义（从 main/types.ts 复用）
// ============================================

/**
 * 账号状态
 */
export enum AccountStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  QR = 'qr',
  Ready = 'ready',
  Error = 'error',
}

/**
 * WhatsApp 用户信息
 */
export interface UserInfo {
  server: string;
  user: string;
  _serialized: string;
}

/**
 * 账号信息
 */
export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  qrCode?: string;
  phoneNumber?: string;
  userInfo?: UserInfo;
  error?: string;
}

/**
 * 发送消息结果
 */
export interface SendMessageResult {
  to: string;
  message: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * 消息历史记录
 */
export interface MessageRecord {
  id: string;
  accountId: string;
  operatorId: number;
  to: string;
  message: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * 标签页信息
 */
export interface Tab {
  id: string;
  title: string;
  closable: boolean;
}

// ============================================
// 存储接口定义
// ============================================

/**
 * 取消订阅函数类型
 */
type UnsubscribeFn = () => void;

/**
 * 统一存储后端接口
 * 所有存储后端（IPC、API）都需要实现此接口
 */
export interface IStorageBackend {
  // ============================================
  // 账号管理
  // ============================================

  /**
   * 获取账号列表
   */
  getAccounts(): Promise<Account[]>;

  /**
   * 创建新账号
   * @param name 账号名称
   * @returns 新创建的账号 ID
   */
  createAccount(name: string): Promise<string>;

  /**
   * 删除账号
   * @param accountId 账号 ID
   */
  deleteAccount(accountId: string): Promise<void>;

  /**
   * 重命名账号
   * @param accountId 账号 ID
   * @param newName 新名称
   */
  renameAccount(accountId: string, newName: string): Promise<void>;

  /**
   * 启动账号（仅 Electron 环境）
   * @param accountId 账号 ID
   */
  startAccount?(accountId: string): Promise<void>;

  /**
   * 停止账号（仅 Electron 环境）
   * @param accountId 账号 ID
   */
  stopAccount?(accountId: string): Promise<void>;

  // ============================================
  // WhatsApp 命令（仅 Electron 环境）
  // ============================================

  /**
   * 发送 WhatsApp 命令（仅 Electron 环境）
   * @param accountId 账号 ID
   * @param command 命令类型
   * @param data 命令数据
   */
  sendWhatsAppCommand?(accountId: string, command: string, data?: any): Promise<any>;

  // ============================================
  // 消息历史
  // ============================================

  /**
   * 保存消息历史
   * @param accountId 账号 ID
   * @param result 发送结果
   * @returns 保存的消息记录
   */
  saveMessageHistory(accountId: string, result: SendMessageResult): Promise<MessageRecord>;

  /**
   * 获取消息历史
   * @param accountId 账号 ID
   * @returns 消息记录列表
   */
  getMessageHistory(accountId: string): Promise<MessageRecord[]>;

  /**
   * 删除单条消息历史
   * @param accountId 账号 ID
   * @param recordId 记录 ID
   * @returns 是否删除成功
   */
  deleteMessageHistory(accountId: string, recordId: string): Promise<boolean>;

  /**
   * 清空账号的所有消息历史
   * @param accountId 账号 ID
   */
  clearMessageHistory(accountId: string): Promise<void>;

  // ============================================
  // 标签页管理（仅 Electron 环境）
  // ============================================

  /**
   * 切换到指定标签页（仅 Electron 环境）
   * @param tabId 标签页 ID
   */
  switchTab?(tabId: string): Promise<void>;

  /**
   * 关闭指定标签页（仅 Electron 环境）
   * @param tabId 标签页 ID
   */
  closeTab?(tabId: string): Promise<void>;

  /**
   * 重新排序标签页（仅 Electron 环境）
   * @param tabIds 新的标签页 ID 顺序
   */
  reorderTabs?(tabIds: string[]): Promise<void>;

  // ============================================
  // 事件订阅
  // ============================================

  /**
   * 订阅账号列表更新事件
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  onAccountsUpdate(callback: (accounts: Account[]) => void): UnsubscribeFn;

  /**
   * 订阅标签页创建事件（仅 Electron 环境）
   * @param callback 回调函数（只包含 id 和 title，closable 由渲染进程决定）
   * @returns 取消订阅函数
   */
  onTabCreated?(callback: (tab: Omit<Tab, 'closable'>) => void): UnsubscribeFn;

  /**
   * 订阅标签页关闭事件（仅 Electron 环境）
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  onTabClosed?(callback: (tabId: string) => void): UnsubscribeFn;

  /**
   * 订阅标签页切换事件（仅 Electron 环境）
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  onTabSwitched?(callback: (tabId: string) => void): UnsubscribeFn;
}
