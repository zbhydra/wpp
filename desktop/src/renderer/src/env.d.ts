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
declare global {
  interface Window {
    electronAPI: import('../shared/types/api').ElectronAPI;
  }
}

export {};
