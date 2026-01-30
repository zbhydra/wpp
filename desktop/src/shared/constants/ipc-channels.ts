export const IPC_CHANNELS = {
  // 窗口控制
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    IS_MAXIMIZED: 'window:isMaximized',
    MAXIMIZED_CHANGED: 'window:maximized-changed',
  },
} as const;
