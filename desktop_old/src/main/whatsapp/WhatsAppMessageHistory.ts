import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getMessageHistoryFilePath } from '../utils/paths';
import { MessageRecord, SendMessageResult, CurrentUser } from '../types';

/**
 * 消息历史存储结构
 */
interface MessageHistoryStorage {
  [accountId: string]: MessageRecord[];
}

/**
 * 消息历史存储接口（抽象层）
 * 方便后期切换到 HTTP 存储
 */
export interface IMessageHistoryStore {
  load(): MessageHistoryStorage;
  save(history: MessageHistoryStorage): void;
}

/**
 * 文件存储实现
 */
class FileMessageHistoryStore implements IMessageHistoryStore {
  private historyFile: string;

  constructor() {
    this.historyFile = getMessageHistoryFilePath();
    this.ensureFile();
  }

  private ensureFile(): void {
    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify({}, null, 2));
    }
  }

  load(): MessageHistoryStorage {
    try {
      const data = fs.readFileSync(this.historyFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load message history:', error);
      return {};
    }
  }

  save(history: MessageHistoryStorage): void {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Failed to save message history:', error);
    }
  }
}

/**
 * 消息历史存储服务
 */
export class MessageHistoryService {
  private store: IMessageHistoryStore;
  private currentUser: CurrentUser;

  constructor(store?: IMessageHistoryStore) {
    // 使用依赖注入，方便测试和切换存储实现
    this.store = store || new FileMessageHistoryStore();
    this.currentUser = this.getCurrentUser();
  }

  /**
   * 获取当前用户
   * TODO: 后期从登录系统获取真实用户信息
   */
  private getCurrentUser(): CurrentUser {
    return { user_id: 1001 };
  }

  /**
   * 获取当前操作者 ID
   */
  getOperatorId(): number {
    return this.currentUser.user_id;
  }

  /**
   * 添加消息记录（自动添加操作者 ID）
   */
  addMessage(accountId: string, result: SendMessageResult): MessageRecord {
    const history = this.store.load();

    const record: MessageRecord = {
      id: uuidv4(),
      accountId,
      operatorId: this.getOperatorId(),
      to: result.to,
      message: result.message,
      timestamp: result.timestamp,
      success: result.success,
      error: result.error,
    };

    if (!history[accountId]) {
      history[accountId] = [];
    }

    // 添加到开头，最新的在前面
    history[accountId].unshift(record);

    // 限制每个账号最多保存 100 条记录
    if (history[accountId].length > 100) {
      history[accountId] = history[accountId].slice(0, 100);
    }

    this.store.save(history);
    return record;
  }

  /**
   * 获取账号的消息历史
   */
  getHistory(accountId: string): MessageRecord[] {
    const history = this.store.load();
    return history[accountId] || [];
  }

  /**
   * 删除消息记录
   */
  deleteMessage(accountId: string, recordId: string): boolean {
    const history = this.store.load();

    if (!history[accountId]) {
      return false;
    }

    const index = history[accountId].findIndex((r) => r.id === recordId);
    if (index === -1) {
      return false;
    }

    history[accountId].splice(index, 1);
    this.store.save(history);
    return true;
  }

  /**
   * 清空账号的所有消息历史
   */
  clearHistory(accountId: string): void {
    const history = this.store.load();
    delete history[accountId];
    this.store.save(history);
  }
}

// 单例导出
export const messageHistoryService = new MessageHistoryService();
