// 账号状态
export enum AccountStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  QR = 'qr',
  Ready = 'ready',
  Error = 'error',
}

// WhatsApp 用户信息
export interface UserInfo {
  server: string;
  user: string;
  _serialized: string;
}

// 账号信息
export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
  qrCode?: string;
  phoneNumber?: string;
  userInfo?: UserInfo;
  error?: string;
}

// WhatsApp 窗口事件类型
export enum WhatsAppEventType {
  AUTH_READY = 'authReady', // wa-js 初始化完成
  AUTH_LOGIN = 'authLogin', // 用户登录成功
  AUTH_LOGOUT = 'authLogout', // 登出
  MESSAGE_RECEIVED = 'messageReceived', // 收到消息
  MESSAGE_SENT = 'messageSent', // 发送消息成功
}

// WhatsApp 命令类型
export enum WhatsAppCommandType {
  SEND_MESSAGE = 'sendMessage',
  GET_CONTACTS = 'getContacts',
  GET_CHATS = 'getChats',
}

// 当前用户信息
export interface CurrentUser {
  user_id: number;
}

// 发送消息结果
export interface SendMessageResult {
  to: string; // 接收者
  message: string; // 消息内容
  timestamp: number; // 发送时间戳
  success: boolean; // 是否成功
  error?: string; // 错误信息
}

// 消息历史记录
export interface MessageRecord {
  id: string; // 记录 ID
  accountId: string; // 账号 ID
  operatorId: number; // 操作者 ID
  to: string; // 接收者
  message: string; // 消息内容
  timestamp: number; // 发送时间戳
  success: boolean;
  error?: string;
}

