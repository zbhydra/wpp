import * as path from 'path';

/**
 * 获取主进程编译后的目录
 */
export function getMainDistDir(): string {
  return path.join(__dirname);
}

/**
 * 获取 preload 目录
 * preload 文件位于 dist/electron/preload/
 */
export function getPreloadDir(): string {
  return path.join(__dirname, '../preload');
}

/**
 * 获取主窗口 preload 脚本路径
 */
export function getMainPreloadPath(): string {
  return path.join(getPreloadDir(), 'index.js');
}

/**
 * 获取 WhatsApp 窗口 preload 脚本路径
 */
export function getWhatsAppPreloadPath(): string {
  return path.join(getPreloadDir(), 'whatsapp-preload.js');
}

/**
 * 获取用户数据目录
 */
export function getUserDataPath(): string {
  const app = require('electron').app;
  return app.getPath('userData');
}

/**
 * 获取 tokens 目录
 */
export function getTokensDir(): string {
  return path.join(getUserDataPath(), 'tokens');
}

/**
 * 获取 sessions 文件路径
 */
export function getSessionsFilePath(): string {
  return path.join(getTokensDir(), 'sessions.json');
}

/**
 * 获取消息历史文件路径
 */
export function getMessageHistoryFilePath(): string {
  return path.join(getTokensDir(), 'message-history.json');
}
