import { BrowserWindow } from 'electron';
import { BaseViewManager } from '../base/BaseViewManager';
import { BrowserViewManager } from '../BrowserViewManager';
import { TAB_CHANNELS } from '../../shared/ipc/channels';

/**
 * 事件服务
 * 负责 Renderer ↔ Main ↔ WhatsApp View 之间的消息转发和事件广播
 */
export class EventService {
  private mainWindow: BrowserWindow | null = null;
  private viewManager: BaseViewManager | null = null;
  private browserViewManager: BrowserViewManager | null = null;

  constructor() {}

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 设置视图管理器引用
   */
  setViewManager(viewManager: BaseViewManager): void {
    this.viewManager = viewManager;
  }

  /**
   * 设置 BrowserView 管理器引用
   */
  setBrowserViewManager(browserViewManager: BrowserViewManager): void {
    this.browserViewManager = browserViewManager;
  }

  /**
   * 向 Renderer 广播事件
   * @param channel 事件频道
   * @param data 事件数据
   */
  broadcastToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // 始终向 admin view 发送事件（账号列表更新等）
      const adminView = this.browserViewManager?.getView('admin');
      if (adminView && !adminView.webContents.isDestroyed()) {
        adminView.webContents.send(channel, data);
      }
    }
  }

  /**
   * 向 WhatsApp View 转发命令
   * @param viewId 视图 ID
   * @param command 命令类型
   * @param data 命令数据
   */
  forwardToWhatsAppView(viewId: string, command: string, data: any = {}): void {
    if (this.viewManager) {
      this.viewManager.sendCommand(viewId, command, data);
    }
  }

  /**
   * 监听 WhatsApp View 事件并转发到 Renderer
   * @param event 事件名称
   * @param data 事件数据
   */
  forwardWhatsAppEventToRenderer(event: string, data: any): void {
    this.broadcastToRenderer(event, data);
  }

  /**
   * 通知 Renderer 标签页已创建
   */
  notifyTabCreated(viewId: string, title: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // 向 TabBar view 发送事件
      const tabBarView = this.browserViewManager?.getView('tabbar');
      if (tabBarView && !tabBarView.webContents.isDestroyed()) {
        tabBarView.webContents.send(TAB_CHANNELS.TAB_CREATED, { id: viewId, title });
      }
    }
  }

  /**
   * 通知 Renderer 标签页已关闭
   */
  notifyTabClosed(viewId: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // 向 TabBar view 发送事件
      const tabBarView = this.browserViewManager?.getView('tabbar');
      if (tabBarView && !tabBarView.webContents.isDestroyed()) {
        tabBarView.webContents.send(TAB_CHANNELS.TAB_CLOSED, viewId);
      }
    }
  }

  /**
   * 通知 Renderer 标签页已切换
   */
  notifyTabSwitched(viewId: string): void {
    // 先实际切换视图
    if (this.browserViewManager) {
      this.browserViewManager.setActiveView(viewId);
    }

    // 然后通知 TabBar view 更新 UI
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const tabBarView = this.browserViewManager?.getView('tabbar');
      if (tabBarView && !tabBarView.webContents.isDestroyed()) {
        tabBarView.webContents.send(TAB_CHANNELS.TAB_SWITCHED, viewId);
      }
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.mainWindow = null;
    this.viewManager = null;
    this.browserViewManager = null;
  }
}

// 单例实例
let eventServiceInstance: EventService | null = null;

/**
 * 获取 EventService 单例
 */
export function getEventService(): EventService {
  if (!eventServiceInstance) {
    eventServiceInstance = new EventService();
  }
  return eventServiceInstance;
}
