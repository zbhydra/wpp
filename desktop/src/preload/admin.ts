import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc-channels';
import type { WindowAPI } from '../shared/types/api';

/**
 * Admin UI Preload Script
 * 暴露给渲染进程的安全 API
 */

// 窗口控制 API
const windowAPI: WindowAPI = {
  minimize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW.MINIMIZE),
  maximize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW.MAXIMIZE),
  close: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW.CLOSE),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.IS_MAXIMIZED),
  
  // 监听窗口最大化状态变化
  onMaximizedChange: (callback: (isMaximized: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => {
      callback(isMaximized);
    };
    ipcRenderer.on(IPC_CHANNELS.WINDOW.MAXIMIZED_CHANGED, handler);
    // 返回取消订阅函数
    return (): void => {
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW.MAXIMIZED_CHANGED, handler);
    };
  },
};

// 版本信息
const versions = {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
};

// 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  window: windowAPI,
  versions,
});

console.log('[Preload] electronAPI exposed successfully');
console.log('[Preload] Versions:', versions);
