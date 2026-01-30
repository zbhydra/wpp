import * as fs from 'fs';
import * as path from 'path';
import { BaseSessionManager } from '../base/BaseSessionManager';
import { getTokensDir, getSessionsFilePath } from '../utils/paths';

/**
 * Session 数据结构
 */
export interface SessionData {
  id: string;
  name: string;
  tokens: any;
  createdAt: number;
  updatedAt: number;
}

/**
 * WhatsApp Session 管理器
 * 负责 WhatsApp 账号的会话持久化
 */
export class WhatsAppSessionManager extends BaseSessionManager<SessionData> {
  private tokensDir: string;
  private sessionsFile: string;

  constructor() {
    super();
    this.tokensDir = getTokensDir();
    this.sessionsFile = getSessionsFilePath();
    this.ensureDir();
  }

  /**
   * 确保目录存在
   */
  private ensureDir(): void {
    if (!fs.existsSync(this.tokensDir)) {
      fs.mkdirSync(this.tokensDir, { recursive: true });
    }
  }

  /**
   * 获取所有账号 ID
   */
  getAccounts(): string[] {
    const sessions = this.loadSessions();
    return Object.keys(sessions);
  }

  /**
   * 获取账号信息
   */
  getAccount(accountId: string): SessionData | null {
    const sessions = this.loadSessions();
    return sessions[accountId] || null;
  }

  /**
   * 保存 session
   */
  saveSession(accountId: string, name: string, tokens: any): void {
    const sessions = this.loadSessions();
    const now = Date.now();

    // 更新或创建 session
    if (sessions[accountId]) {
      sessions[accountId].tokens = tokens;
      sessions[accountId].updatedAt = now;
    } else {
      sessions[accountId] = {
        id: accountId,
        name,
        tokens,
        createdAt: now,
        updatedAt: now,
      };
    }

    this.saveSessions(sessions);
  }

  /**
   * 保存账号元数据（不包含 tokens）
   */
  saveAccount(accountId: string, name: string): void {
    const sessions = this.loadSessions();
    const now = Date.now();

    sessions[accountId] = {
      id: accountId,
      name,
      tokens: {}, // 初始为空对象，登录后会更新
      createdAt: now,
      updatedAt: now,
    };

    this.saveSessions(sessions);
  }

  /**
   * 删除 session
   */
  deleteSession(accountId: string): void {
    const sessions = this.loadSessions();
    delete sessions[accountId];
    this.saveSessions(sessions);

    // 删除 token 文件
    const tokenFile = path.join(this.tokensDir, `${accountId}.json`);
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile);
    }
  }

  /**
   * 重命名账号
   */
  renameAccount(accountId: string, newName: string): void {
    const sessions = this.loadSessions();
    if (sessions[accountId]) {
      sessions[accountId].name = newName;
      sessions[accountId].updatedAt = Date.now();
      this.saveSessions(sessions);
    }
  }

  /**
   * 获取 token 文件路径
   */
  getTokenPath(accountId: string): string {
    return path.join(this.tokensDir, `${accountId}.json`);
  }

  /**
   * 加载 sessions
   */
  private loadSessions(): Record<string, SessionData> {
    try {
      if (fs.existsSync(this.sessionsFile)) {
        const data = fs.readFileSync(this.sessionsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
    return {};
  }

  /**
   * 保存 sessions
   */
  private saveSessions(sessions: Record<string, SessionData>): void {
    try {
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }
}
