import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'WPP Manager',
    webPreferences: {
      preload: __dirname + '/../../preload/index.js',
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 开发环境加载本地文件，后续会连接 Vben Admin
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  console.log('WPP Manager Electron App is ready')
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
