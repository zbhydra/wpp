import { contextBridge, ipcRenderer } from 'electron';
import { Account } from '../main/types';
import { DEBUG_MODE } from '../shared/debug';

// Preload 性能追踪
const preloadStart = Date.now();
if (DEBUG_MODE) console.log('[Preload] Script started at', preloadStart);

/**
 * 暴露给渲染进程的 API
 */
const api = {
  // ========== 账号管理 ==========

  // 获取账号列表
  getAccounts: () => ipcRenderer.invoke('whatsapp:getAccounts'),

  // 启动账号
  startAccount: (accountId: string) => ipcRenderer.invoke('whatsapp:startAccount', accountId),

  // 停止账号
  stopAccount: (accountId: string) => ipcRenderer.invoke('whatsapp:stopAccount', accountId),

  // 删除账号
  deleteAccount: (accountId: string) => ipcRenderer.invoke('whatsapp:deleteAccount', accountId),

  // 重命名账号
  renameAccount: (accountId: string, newName: string) =>
    ipcRenderer.invoke('whatsapp:renameAccount', accountId, newName),

  // 创建新账号
  createAccount: (name: string) => ipcRenderer.invoke('whatsapp:createAccount', name),

  // ========== WhatsApp 窗口命令 ==========

  // 发送命令到 WhatsApp Window
  sendWhatsAppCommand: (accountId: string, command: string, data?: any) =>
    ipcRenderer.invoke('whatsapp:sendCommand', accountId, command, data),

  // ========== 消息历史 ==========

  // 保存消息历史
  saveMessageHistory: (accountId: string, result: any) =>
    ipcRenderer.invoke('messageHistory:save', accountId, result),

  // 获取消息历史
  getMessageHistory: (accountId: string) =>
    ipcRenderer.invoke('messageHistory:get', accountId),

  // 删除消息历史
  deleteMessageHistory: (accountId: string, recordId: string) =>
    ipcRenderer.invoke('messageHistory:delete', accountId, recordId),

  // 清空消息历史
  clearMessageHistory: (accountId: string) =>
    ipcRenderer.invoke('messageHistory:clear', accountId),

  // ========== 事件监听 ==========

  // 监听账号列表更新
  onAccountsUpdate: (callback: (accounts: Account[]) => void) => {
    const listener = (_event: any, accounts: Account[]) => callback(accounts);
    ipcRenderer.on('whatsapp:accounts:update', listener);
    return () => ipcRenderer.removeListener('whatsapp:accounts:update', listener);
  },

  // 监听消息接收事件（新增）
  onMessageReceived: (callback: (data: { accountId: string; message: any }) => void) => {
    const listener = (_event: any, data: { accountId: string; message: any }) => callback(data);
    ipcRenderer.on('whatsapp:message:received', listener);
    return () => ipcRenderer.removeListener('whatsapp:message:received', listener);
  },

  // 监听消息发送事件（新增）
  onMessageSent: (callback: (data: { accountId: string; message: any }) => void) => {
    const listener = (_event: any, data: { accountId: string; message: any }) => callback(data);
    ipcRenderer.on('whatsapp:message:sent', listener);
    return () => ipcRenderer.removeListener('whatsapp:message:sent', listener);
  },

  // ========== 标签页管理 ==========

  // 切换标签页
  switchTab: (tabId: string) => ipcRenderer.invoke('tab:switch', tabId),

  // 关闭标签页
  closeTab: (tabId: string) => ipcRenderer.invoke('tab:close', tabId),

  // 重新排序标签页
  reorderTabs: (tabIds: string[]) => ipcRenderer.invoke('tab:reorder', tabIds),

  // 监听标签页创建事件
  onTabCreated: (callback: (tab: { id: string; title: string }) => void) => {
    const listener = (_event: any, tab: { id: string; title: string }) => callback(tab);
    ipcRenderer.on('tab:created', listener);
    return () => ipcRenderer.removeListener('tab:created', listener);
  },

  // 监听标签页关闭事件
  onTabClosed: (callback: (tabId: string) => void) => {
    const listener = (_event: any, tabId: string) => callback(tabId);
    ipcRenderer.on('tab:closed', listener);
    return () => ipcRenderer.removeListener('tab:closed', listener);
  },

  // 监听标签页切换事件
  onTabSwitched: (callback: (tabId: string) => void) => {
    const listener = (_event: any, tabId: string) => callback(tabId);
    ipcRenderer.on('tab:switched', listener);
    return () => ipcRenderer.removeListener('tab:switched', listener);
  },

  // 调试模式开关
  DEBUG_MODE: DEBUG_MODE,
};

/**
 * 类型声明
 */
export type ElectronAPI = typeof api;

const apiCreatedTime = Date.now();
if (DEBUG_MODE) console.log('[Preload] API object created in', apiCreatedTime - preloadStart, 'ms');

/**
 * 暴露 API 到 window
 */
const exposeStart = Date.now();
contextBridge.exposeInMainWorld('electronAPI', api);
if (DEBUG_MODE) {
  console.log('[Preload] contextBridge.exposeInMainWorld took', Date.now() - exposeStart, 'ms');
  console.log('[Preload] Total preload time:', Date.now() - preloadStart, 'ms');
}
