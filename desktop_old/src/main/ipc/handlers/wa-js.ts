import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { debugLog, DEBUG_MODE } from '../../main';

/**
 * 注册 wa-js 相关的 IPC handlers
 * 为 preload 脚本提供读取 wa-js 文件的能力
 */
export function registerWaJsHandlers(): void {
  // 读取 wa-js 文件内容
  ipcMain.handle('wa-js:read-file', async (_event, fileName: string) => {
    try {
      let filePath: string;

      if (fileName === 'wa.js') {
        // require.resolve 直接返回主入口文件路径，已包含 dist/wppconnect-wa.js
        filePath = require.resolve('@wppconnect/wa-js');
      } else if (fileName === 'wapi.js') {
        // require.resolve 返回 dist/index.js，需要找到 lib/wapi/wapi.js
        const wppconnectEntry = require.resolve('@wppconnect-team/wppconnect');
        const distDir = path.dirname(wppconnectEntry);
        filePath = path.join(distDir, 'lib/wapi/wapi.js');
      } else {
        return { success: false, error: `Unknown file: ${fileName}` };
      }

      debugLog(`Reading wa-js file: ${fileName} from ${filePath}`);

      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[IPC] Failed to read wa-js file (${fileName}):`, errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  debugLog('wa-js handlers registered');
}
