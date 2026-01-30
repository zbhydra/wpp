import { contextBridge, ipcRenderer } from 'electron';

/**
 * Admin UI Preload Script
 * 暴露给渲染进程的安全 API
 */

// 窗口控制 API
const windowAPI = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  
  // 监听窗口最大化状态变化
  onMaximizedChange: (callback: (isMaximized: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => {
      callback(isMaximized);
    };
    ipcRenderer.on('window:maximized-changed', handler);
    // 返回取消订阅函数
    return (): void => {
      ipcRenderer.removeListener('window:maximized-changed', handler);
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
