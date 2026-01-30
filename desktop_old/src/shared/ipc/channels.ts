/**
 * IPC 通道常量定义
 * 统一管理所有 IPC 事件名称
 */

/**
 * WhatsApp Window IPC 通道
 * 用于 WhatsApp Window (隐藏的浏览器窗口) 与 Main Process 之间的通信
 */
export const WHATSAPP_WINDOW_CHANNELS = {
  // WhatsApp Window → Main (事件上报)

  /** WA-JS 初始化完成 */
  READY: (accountId: string) => `whatsapp_window:ready:${accountId}`,

  /** 用户登录成功 */
  LOGIN: (accountId: string) => `whatsapp_window:login:${accountId}`,

  /** 用户登出 */
  LOGOUT: (accountId: string) => `whatsapp_window:logout:${accountId}`,

  /** 用户信息更新 */
  USER_INFO: (accountId: string) => `whatsapp_window:user_info:${accountId}`,

  /** 收到新消息 */
  MESSAGE_RECEIVED: (accountId: string) => `whatsapp_window:message_received:${accountId}`,

  /** 消息发送成功 */
  MESSAGE_SENT: (accountId: string) => `whatsapp_window:message_sent:${accountId}`,

  /** 错误事件 */
  ERROR: (accountId: string) => `whatsapp_window:error:${accountId}`,

  /** 联系人列表返回（可选） */
  CONTACTS: (accountId: string) => `whatsapp_window:contacts:${accountId}`,

  /** 聊天列表返回（可选） */
  CHATS: (accountId: string) => `whatsapp_window:chats:${accountId}`,

  // Main → WhatsApp Window (命令下发)

  /** 通用命令通道 */
  COMMAND: 'whatsapp_window:command',
} as const;

/**
 * Renderer Process IPC 通道
 * 用于 UI 渲染进程与 Main Process 之间的通信
 */
export const RENDERER_CHANNELS = {
  // Renderer → Main (invoke 模式 - 双向通信)

  /** 获取账号列表 */
  WHATSAPP_GET_ACCOUNTS: 'whatsapp:getAccounts',

  /** 启动账号 */
  WHATSAPP_START_ACCOUNT: 'whatsapp:startAccount',

  /** 停止账号 */
  WHATSAPP_STOP_ACCOUNT: 'whatsapp:stopAccount',

  /** 删除账号 */
  WHATSAPP_DELETE_ACCOUNT: 'whatsapp:deleteAccount',

  /** 重命名账号 */
  WHATSAPP_RENAME_ACCOUNT: 'whatsapp:renameAccount',

  /** 创建新账号 */
  WHATSAPP_CREATE_ACCOUNT: 'whatsapp:createAccount',

  /** 发送命令到 WhatsApp Window */
  WHATSAPP_SEND_COMMAND: 'whatsapp:sendCommand',

  // Main → Renderer (单向广播)

  /** 账号列表更新 */
  WHATSAPP_ACCOUNTS_UPDATE: 'whatsapp:accounts:update',

  /** 消息接收事件 */
  WHATSAPP_MESSAGE_RECEIVED: 'whatsapp:message:received',

  /** 消息发送事件 */
  WHATSAPP_MESSAGE_SENT: 'whatsapp:message:sent',
} as const;

/**
 * 消息历史 IPC 通道
 */
export const MESSAGE_HISTORY_CHANNELS = {
  /** 保存消息历史 */
  SAVE: 'messageHistory:save',

  /** 获取消息历史 */
  GET: 'messageHistory:get',

  /** 删除消息历史 */
  DELETE: 'messageHistory:delete',

  /** 清空消息历史 */
  CLEAR: 'messageHistory:clear',
} as const;

/**
 * WA-JS 文件读取通道
 */
export const WA_JS_CHANNELS = {
  /** 读取 wa-js/wapi.js 文件 */
  READ_FILE: 'wa-js:read-file',
} as const;

/**
 * 标签页管理 IPC 通道
 * 用于 Renderer 与 Main Process 之间的标签页操作
 */
export const TAB_CHANNELS = {
  // Renderer → Main (invoke 模式 - 双向通信)

  /** 切换标签页 */
  SWITCH_TAB: 'tab:switch',

  /** 关闭标签页 */
  CLOSE_TAB: 'tab:close',

  /** 重新排序标签页 */
  REORDER_TABS: 'tab:reorder',

  // Main → Renderer (单向广播)

  /** 标签页已创建 */
  TAB_CREATED: 'tab:created',

  /** 标签页已关闭 */
  TAB_CLOSED: 'tab:closed',

  /** 标签页已切换 */
  TAB_SWITCHED: 'tab:switched',
} as const;
