/**
 * 视图事件回调接口
 */
export interface ViewCallbacks {
  onReady?: () => void;
  onLogin?: () => void;
  onUserInfo?: (viewId: string, userInfo: any) => void;
  onLogout?: () => void;
  onMessageReceived?: (viewId: string, message: any) => void;
  onMessageSent?: (viewId: string, message: any) => void;
  onError?: (viewId: string, error: string) => void;
  onClosed?: () => void;
}

/**
 * 视图管理器基类
 * 为不同平台提供统一的视图管理接口
 */
export abstract class BaseViewManager {
  /**
   * 创建视图
   */
  abstract createView(viewId: string): any;

  /**
   * 检查视图是否存在
   */
  abstract hasView(viewId: string): boolean;

  /**
   * 切换到指定视图
   */
  abstract switchView(viewId: string): void;

  /**
   * 关闭视图
   */
  abstract closeView(viewId: string): Promise<void>;

  /**
   * 关闭所有视图
   */
  abstract closeAllViews(): Promise<void>;

  /**
   * 注册视图事件回调
   */
  abstract registerCallbacks(viewId: string, callbacks: ViewCallbacks): void;

  /**
   * 向视图发送命令
   */
  abstract sendCommand(viewId: string, command: string, data?: any): void;
}
