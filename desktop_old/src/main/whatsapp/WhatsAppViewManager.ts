import { WhatsAppBrowserView, WhatsAppViewCallbacks } from './WhatsAppBrowserView';
import { BaseViewManager, ViewCallbacks } from '../base/BaseViewManager';

/**
 * WhatsApp 视图管理器
 * 管理多个 WhatsApp BrowserView 的创建、销毁和事件分发
 */
export class WhatsAppViewManager extends BaseViewManager {
  private views: Map<string, WhatsAppBrowserView> = new Map();
  private statusCallbacks: Map<string, ViewCallbacks> = new Map();

  /**
   * 注册账号的状态回调
   */
  registerCallbacks(viewId: string, callbacks: ViewCallbacks): void {
    this.statusCallbacks.set(viewId, callbacks);
  }

  /**
   * 取消注册回调
   */
  unregisterCallbacks(viewId: string): void {
    this.statusCallbacks.delete(viewId);
  }

  /**
   * 创建新视图
   */
  createView(viewId: string): WhatsAppBrowserView {
    // 检查是否已存在
    const existingView = this.views.get(viewId);
    if (existingView && !existingView.isDestroyed()) {
      return existingView;
    }

    // 创建回调桥接
    const callbacks: WhatsAppViewCallbacks = {
      onReady: () => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onReady) {
          cb.onReady();
        }
      },
      onLogin: () => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onLogin) {
          cb.onLogin();
        }
      },
      onUserInfo: (accountId: string, userInfo: any) => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onUserInfo) {
          cb.onUserInfo(accountId, userInfo);
        }
      },
      onLogout: () => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onLogout) {
          cb.onLogout();
        }
      },
      onMessageReceived: (accountId: string, message: any) => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onMessageReceived) {
          cb.onMessageReceived(accountId, message);
        }
      },
      onMessageSent: (accountId: string, message: any) => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onMessageSent) {
          cb.onMessageSent(accountId, message);
        }
      },
      onError: (accountId: string, error: string) => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onError) {
          cb.onError(accountId, error);
        }
      },
      onClosed: () => {
        const cb = this.statusCallbacks.get(viewId);
        if (cb?.onClosed) {
          cb.onClosed();
        }
        // 从 Map 中移除
        this.views.delete(viewId);
        this.statusCallbacks.delete(viewId);
      },
    };

    // 创建视图
    const waView = new WhatsAppBrowserView(viewId, callbacks);
    this.views.set(viewId, waView);

    return waView;
  }

  /**
   * 获取视图
   */
  getView(viewId: string): WhatsAppBrowserView | null {
    return this.views.get(viewId) || null;
  }

  /**
   * 检查视图是否存在
   */
  hasView(viewId: string): boolean {
    const view = this.views.get(viewId);
    return view !== undefined && !view.isDestroyed();
  }

  /**
   * 切换到指定视图
   */
  switchView(viewId: string): void {
    // WhatsApp 视图的切换由 BrowserViewManager 处理
    // 这里只需要聚焦视图
    this.focusView(viewId);
  }

  /**
   * 聚焦视图
   */
  focusView(viewId: string): void {
    const view = this.views.get(viewId);
    if (view && !view.isDestroyed()) {
      view.focus();
    }
  }

  /**
   * 检查视图的 wa-js 是否就绪
   */
  isViewReady(viewId: string): boolean {
    const view = this.views.get(viewId);
    return view ? view.isReady() : false;
  }

  /**
   * 获取所有视图 ID
   */
  getViewIds(): string[] {
    return Array.from(this.views.keys());
  }

  /**
   * 获取视图数量
   */
  getViewCount(): number {
    return this.views.size;
  }

  /**
   * 关闭视图
   */
  async closeView(viewId: string): Promise<void> {
    const view = this.views.get(viewId);
    if (view) {
      await view.close();
      view.cleanup();
      this.views.delete(viewId);
      this.statusCallbacks.delete(viewId);
    }
  }

  /**
   * 关闭所有视图
   */
  async closeAllViews(): Promise<void> {
    const closePromises = Array.from(this.views.values()).map((view) => view.close());
    await Promise.all(closePromises);
    this.views.clear();
    this.statusCallbacks.clear();
  }

  /**
   * 清理已销毁的视图
   */
  cleanupDestroyedViews(): void {
    for (const [viewId, view] of this.views.entries()) {
      if (view.isDestroyed()) {
        view.cleanup();
        this.views.delete(viewId);
        this.statusCallbacks.delete(viewId);
      }
    }
  }

  /**
   * 向视图发送命令
   */
  sendCommand(viewId: string, command: string, data?: any): void {
    const view = this.views.get(viewId);
    if (view && !view.isDestroyed()) {
      view.sendCommand(command, data);
    } else {
      console.error(`View for ${viewId} not found or destroyed`);
    }
  }
}
