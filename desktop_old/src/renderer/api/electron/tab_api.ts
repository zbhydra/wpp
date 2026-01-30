/**
 * Tab Electron API
 * 封装 Electron 标签页管理和事件
 */

import type { TabCreateInfo } from '../types';

/**
 * Electron API 接口（从 preload 暴露的接口）
 */
interface ElectronAPI {
  // 标签页管理
  switchTab(tabId: string): Promise<void>;
  closeTab(tabId: string): Promise<void>;
  reorderTabs(tabIds: string[]): Promise<void>;

  // 事件订阅
  onTabCreated(callback: (tab: { id: string; title: string }) => void): () => void;
  onTabClosed(callback: (tabId: string) => void): () => void;
  onTabSwitched(callback: (tabId: string) => void): () => void;
}

/**
 * Tab Electron API 类
 */
export class TabElectronAPI {
  private api: ElectronAPI;

  constructor() {
    if (!window.electronAPI) {
      throw new Error('electronAPI is not available. Make sure you are running in Electron environment.');
    }
    this.api = window.electronAPI as ElectronAPI;
  }

  /**
   * 切换到指定标签页
   */
  async switchTab(tabId: string): Promise<void> {
    return this.api.switchTab(tabId);
  }

  /**
   * 关闭指定标签页
   */
  async closeTab(tabId: string): Promise<void> {
    return this.api.closeTab(tabId);
  }

  /**
   * 重新排序标签页
   */
  async reorderTabs(tabIds: string[]): Promise<void> {
    return this.api.reorderTabs(tabIds);
  }

  /**
   * 订阅标签页创建事件
   */
  onTabCreated(callback: (tab: Omit<TabCreateInfo, 'closable'>) => void): () => void {
    return this.api.onTabCreated(callback);
  }

  /**
   * 订阅标签页关闭事件
   */
  onTabClosed(callback: (tabId: string) => void): () => void {
    return this.api.onTabClosed(callback);
  }

  /**
   * 订阅标签页切换事件
   */
  onTabSwitched(callback: (tabId: string) => void): () => void {
    return this.api.onTabSwitched(callback);
  }
}
