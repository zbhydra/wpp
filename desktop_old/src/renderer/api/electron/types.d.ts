/**
 * Electron API 类型声明
 * 用于 renderer/api/electron/ 目录
 */

export interface ElectronAPI {
  // WhatsApp 命令
  sendWhatsAppCommand(accountId: string, command: string, data?: any): Promise<any>;

  // 事件订阅
  onAccountsUpdate(callback: (accounts: any[]) => void): () => void;

  // 标签页管理
  switchTab(tabId: string): Promise<void>;
  closeTab(tabId: string): Promise<void>;
  reorderTabs(tabIds: string[]): Promise<void>;

  // 事件订阅
  onTabCreated(callback: (tab: { id: string; title: string }) => void): () => void;
  onTabClosed(callback: (tabId: string) => void): () => void;
  onTabSwitched(callback: (tabId: string) => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
