import { app, BrowserWindow } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { MainWindow } from './window/main-window';

let mainWindow: MainWindow | null = null;

function initialize(): void {
  // 设置 Electron 应用默认行为
  electronApp.setAppUserModelId('com.wpp.desktop');

  // 开发环境中默认用 F12 打开开发者工具
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  mainWindow = new MainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = new MainWindow();
    } else {
      mainWindow?.focus();
    }
  });
}

app.whenReady().then(() => {
  initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
