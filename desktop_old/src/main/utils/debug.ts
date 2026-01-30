import { DEBUG_MODE } from '../../shared/debug';

/**
 * 全局调试日志函数
 */
export function debugLog(...args: any[]): void {
  if (DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * 全局调试性能日志函数
 */
export function debugPerf(...args: any[]): void {
  if (DEBUG_MODE) {
    console.log('[Perf]', ...args);
  }
}

/**
 * 导出调试开关供其他模块使用
 */
export { DEBUG_MODE };
