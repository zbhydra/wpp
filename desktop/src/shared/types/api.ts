/**
 * 窗口控制相关的类型定义
 */
export interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
}

/**
 * 暴露给渲染进程的完整电子 API
 */
export interface ElectronAPI {
  window: WindowAPI;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}
