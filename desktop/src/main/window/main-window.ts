import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

export class MainWindow {
  private window: BrowserWindow | null = null;

  constructor() {
    this.createWindow();
  }

  private createWindow(): void {
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'darwin' 
        ? { titleBarStyle: 'hiddenInset' } 
        : { frame: false }
      ),
      webPreferences: {
        preload: join(__dirname, '../preload/admin.js'),
        sandbox: false,
        contextIsolation: true,
      },
    });

    this.window.on('ready-to-show', () => {
      this.window?.show();
    });

    // 外部链接用浏览器打开
    this.window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // 开发模式加载 URL，生产模式加载文件
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      this.window.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  public focus(): void {
    if (this.window) {
      if (this.window.isMinimized()) this.window.restore();
      this.window.focus();
    }
  }
}
