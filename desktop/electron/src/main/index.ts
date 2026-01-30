import { app } from 'electron';

/**
 * Electron Main Process Entry Point
 */
app.whenReady().then(() => {
  console.log('WPP Manager Electron App is ready');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
