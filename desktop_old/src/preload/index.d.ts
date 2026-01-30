import { Account, SendMessageResult, MessageRecord } from '../main/types';

export interface ElectronAPI {
  // 账号管理
  getAccounts: () => Promise<Account[]>;
  startAccount: (accountId: string) => Promise<void>;
  stopAccount: (accountId: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  renameAccount: (accountId: string, newName: string) => Promise<void>;
  createAccount: (name: string) => Promise<string>;

  // WhatsApp 命令
  sendWhatsAppCommand: (accountId: string, command: string, data?: any) => Promise<any>;

  // 消息历史
  saveMessageHistory: (accountId: string, result: SendMessageResult) => Promise<MessageRecord>;
  getMessageHistory: (accountId: string) => Promise<MessageRecord[]>;
  deleteMessageHistory: (accountId: string, recordId: string) => Promise<boolean>;
  clearMessageHistory: (accountId: string) => Promise<void>;

  // 标签页管理
  switchTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  reorderTabs: (tabIds: string[]) => Promise<void>;

  // 事件订阅
  onAccountsUpdate: (callback: (accounts: Account[]) => void) => () => void;
  onTabCreated: (callback: (tab: { id: string; title: string }) => void) => () => void;
  onTabClosed: (callback: (tabId: string) => void) => () => void;
  onTabSwitched: (callback: (tabId: string) => void) => () => void;

  // 调试模式
  DEBUG_MODE: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };
