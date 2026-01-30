import { ipcMain } from 'electron';
import { BrowserViewManager } from '../../BrowserViewManager';
import { WhatsAppAccountManager } from '../../whatsapp/WhatsAppAccountManager';
import { TAB_CHANNELS } from '../../../shared/ipc/channels';

/**
 * 注册标签页相关的 IPC 处理器
 */
export function registerTabHandlers(
  viewManager: BrowserViewManager,
  accountManager: WhatsAppAccountManager
): void {
  // 切换标签页
  ipcMain.handle(TAB_CHANNELS.SWITCH_TAB, async (_event, tabId: string) => {
    console.log(`[IPC] Switch to tab: ${tabId}`);
    viewManager.setActiveView(tabId);
  });

  // 关闭标签页
  ipcMain.handle(TAB_CHANNELS.CLOSE_TAB, async (_event, tabId: string) => {
    console.log(`[IPC] Close tab: ${tabId}`);

    // 如果是 WhatsApp 账号标签，停止账号（会自动关闭视图和更新状态）
    if (tabId !== 'admin' && tabId !== 'tabbar') {
      try {
        await accountManager.stopAccount(tabId);
      } catch (error) {
        console.error(`[IPC] Failed to stop account ${tabId}:`, error);
      }
    } else {
      // admin 和 tabbar 不应该被关闭，但为了保险直接关闭视图
      await viewManager.closeView(tabId);
    }
  });

  // 重新排序标签页
  ipcMain.handle(TAB_CHANNELS.REORDER_TABS, async (_event, tabIds: string[]) => {
    console.log(`[IPC] Reorder tabs:`, tabIds);
    // 这里可以存储标签页顺序，如果需要持久化
    // 目前主要用于同步 renderer 端的拖拽排序结果
  });
}
