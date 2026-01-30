import { ipcMain, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';

/**
 * 注册窗口控制相关的 IPC 事件处理器
 */
export function registerWindowIpcHandlers(): void {
  console.log('[IPC] Registering window IPC handlers...');
  // 最小化窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.MINIMIZE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  // 最大化/还原窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.MAXIMIZE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.on(IPC_CHANNELS.WINDOW.CLOSE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  // 获取窗口状态
  ipcMain.handle(IPC_CHANNELS.WINDOW.IS_MAXIMIZED, (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized() ?? false;
  });
}

