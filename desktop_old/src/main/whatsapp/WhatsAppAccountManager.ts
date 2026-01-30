import { BrowserWindow } from 'electron';
import { Account, AccountStatus, UserInfo } from '../types';
import { BaseAccountManager } from '../base/BaseAccountManager';
import { WhatsAppSessionManager } from './WhatsAppSessionManager';
import { WhatsAppViewManager } from './WhatsAppViewManager';
import { BrowserViewManager } from '../BrowserViewManager';
import { getEventService } from '../services/EventService';

/**
 * WhatsApp 账号管理器
 * 负责 WhatsApp 账号的 CRUD 操作和生命周期管理
 */
export class WhatsAppAccountManager extends BaseAccountManager {
  private sessionManager: WhatsAppSessionManager;
  private viewManager: WhatsAppViewManager;
  private browserViewManager: BrowserViewManager;
  private eventService = getEventService();
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow, browserViewManager: BrowserViewManager) {
    super();
    this.mainWindow = mainWindow;
    this.browserViewManager = browserViewManager;
    this.sessionManager = new WhatsAppSessionManager();
    this.viewManager = new WhatsAppViewManager();

    // 设置 EventService 的引用
    this.eventService.setMainWindow(mainWindow);
    this.eventService.setViewManager(this.viewManager);
    this.eventService.setBrowserViewManager(browserViewManager);

    this.loadAccounts();
  }

  /**
   * 加载已有账号
   */
  private loadAccounts(): void {
    const accountIds = this.sessionManager.getAccounts();
    for (const id of accountIds) {
      const session = this.sessionManager.getAccount(id);
      if (session) {
        this.accounts.set(id, {
          id,
          name: session.name,
          status: AccountStatus.Stopped,
        });
      }
    }
    this.sendAccountsUpdate();
  }

  /**
   * 获取所有账号列表
   */
  getAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  /**
   * 创建新账号
   */
  async createAccount(name: string): Promise<string> {
    const id = `account_${Date.now()}`;
    const account: Account = {
      id,
      name,
      status: AccountStatus.Stopped,
    };

    // 立即保存到本地
    this.sessionManager.saveAccount(id, name);

    // 添加到内存
    this.accounts.set(id, account);
    this.sendAccountsUpdate();

    return id;
  }

  /**
   * 获取账号名称
   */
  private getAccountName(accountId: string): string {
    const account = this.accounts.get(accountId);
    return account?.name || accountId;
  }

  /**
   * 启动账号
   */
  async startAccount(accountId: string): Promise<void> {
    // 检查是否已经运行
    if (this.viewManager.hasView(accountId)) {
      // 已存在，切换到该标签
      this.eventService.notifyTabSwitched(accountId);
      throw new Error('Account already running');
    }

    // 更新状态为启动中
    this.updateAccountStatus(accountId, AccountStatus.Starting);

    // 注册回调
    this.viewManager.registerCallbacks(accountId, {
      onReady: () => {
        console.log(`Account ${accountId} WA-JS ready`);
      },
      onLogin: () => {
        console.log(`Account ${accountId} logged in`);
        this.updateAccountStatus(accountId, AccountStatus.Ready);
      },
      onUserInfo: (_accountId: string, userInfo: any) => {
        console.log(`Account ${accountId} user info received:`, userInfo);
        this.updateAccountUserInfo(accountId, userInfo);
      },
      onLogout: () => {
        console.log(`Account ${accountId} logged out`);
        this.updateAccountStatus(accountId, AccountStatus.QR);
      },
      onMessageReceived: (_accountId: string, message: any) => {
        console.log(`Message received:`, message);
        this.eventService.forwardWhatsAppEventToRenderer('whatsapp:message:received', {
          accountId,
          message,
        });
      },
      onMessageSent: (_accountId: string, message: any) => {
        console.log(`Message sent:`, message);
        this.eventService.forwardWhatsAppEventToRenderer('whatsapp:message:sent', {
          accountId,
          message,
        });
      },
      onError: (_accountId: string, error: string) => {
        console.error(`Account error:`, error);
        this.updateAccountStatus(accountId, AccountStatus.Error, error);
      },
      onClosed: () => {
        console.log(`Account ${accountId} view closed`);
        this.updateAccountStatus(accountId, AccountStatus.Stopped);
      },
    });

    try {
      // 创建视图
      const waView = this.viewManager.createView(accountId);

      try {
        // 将 BrowserView 添加到 BrowserViewManager
        this.browserViewManager.addWhatsAppView(accountId, waView.getBrowserView()!);

        // 加载 WhatsApp Web
        await waView.load();

        // 通知 Renderer 创建标签页
        this.eventService.notifyTabCreated(accountId, this.getAccountName(accountId));

        // 切换到新标签
        this.eventService.notifyTabSwitched(accountId);

        // 窗口加载完成，更新状态为 QR（等待扫码或自动登录）
        this.updateAccountStatus(accountId, AccountStatus.QR);
      } catch (loadError) {
        // 加载失败时清理已创建的资源
        await this.viewManager.closeView(accountId);
        await this.browserViewManager.closeView(accountId);
        throw loadError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateAccountStatus(accountId, AccountStatus.Error, errorMessage);
      throw error;
    }
  }

  /**
   * 停止账号
   */
  async stopAccount(accountId: string): Promise<void> {
    // 先关闭 WhatsAppView（清理资源）
    await this.viewManager.closeView(accountId);
    // 再关闭 BrowserView（会通知 TabBar 更新）
    await this.browserViewManager.closeView(accountId);
    // 更新状态（会通知 admin view 更新列表）
    this.updateAccountStatus(accountId, AccountStatus.Stopped);
  }

  /**
   * 更新账号状态（重写基类方法，添加状态同步到 renderer）
   */
  protected updateAccountStatus(
    accountId: string,
    status: AccountStatus,
    error?: string
  ): void {
    super.updateAccountStatus(accountId, status, error);
    this.sendAccountsUpdate();
  }

  /**
   * 删除账号
   */
  async deleteAccount(accountId: string): Promise<void> {
    await this.stopAccount(accountId);
    this.sessionManager.deleteSession(accountId);
    this.accounts.delete(accountId);
    this.sendAccountsUpdate();
  }

  /**
   * 重命名账号
   */
  async renameAccount(accountId: string, newName: string): Promise<void> {
    this.sessionManager.renameAccount(accountId, newName);
    const account = this.accounts.get(accountId);
    if (account) {
      account.name = newName;
      this.sendAccountsUpdate();
    }
  }

  /**
   * 更新账号用户信息
   */
  private updateAccountUserInfo(accountId: string, userInfo: UserInfo): void {
    const account = this.accounts.get(accountId);
    if (account) {
      account.userInfo = userInfo;
      if (userInfo?.user) {
        account.phoneNumber = userInfo.user;
      }
      this.sendAccountsUpdate();
    }
  }

  /**
   * 发送账号列表更新到 Renderer
   */
  private sendAccountsUpdate(): void {
    this.eventService.broadcastToRenderer(
      'whatsapp:accounts:update',
      Array.from(this.accounts.values())
    );
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    await this.viewManager.closeAllViews();
  }
}
