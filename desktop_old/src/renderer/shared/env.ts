/**
 * 运行时环境类型
 */
export type RuntimeEnvironment = 'browser' | 'electron';

/**
 * 环境状态接口
 */
export interface EnvState {
  /** 当前运行环境 */
  runtimeEnvironment: RuntimeEnvironment;
  /** 是否为 Electron 环境 */
  isElectron: boolean;
  /** 是否为浏览器环境 */
  isBrowser: boolean;
}

/**
 * 检测当前运行环境
 * @returns 运行时环境类型
 */
export function detectEnvironment(): RuntimeEnvironment {
  return typeof window !== 'undefined' && window.electronAPI ? 'electron' : 'browser';
}
