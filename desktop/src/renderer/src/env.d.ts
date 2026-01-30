/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

/**
 * Electron API 类型定义
 * 与 preload/admin.ts 中暴露的 API 保持一致
 */
interface ElectronWindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
}

interface ElectronVersions {
  node: string;
  chrome: string;
  electron: string;
}

interface ElectronAPI {
  window: ElectronWindowAPI;
  versions: ElectronVersions;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
