/**
 * API 类型定义
 * 同步 server 端的 protocol 定义
 */

// ============================================
// 认证相关类型
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface EnterpriseInfo {
  id: number;
  name: string;
  slug: string;
  role: string;
  joined_at?: number;
}

export interface UserInfo {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: number;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
  current_enterprise?: EnterpriseInfo;
  enterprises: EnterpriseInfo[];
}

export interface SwitchEnterpriseRequest {
  enterprise_id: number;
}

export interface SwitchEnterpriseResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  current_enterprise: EnterpriseInfo;
}

export interface LogoutResponse {
  message: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ============================================
// 企业相关类型
// ============================================

export interface CreateEnterpriseRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface EnterpriseResponse {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  is_active: boolean;
  created_at: number;
}

export interface EnterpriseDetailResponse extends EnterpriseResponse {
  role: string;
  member_count: number;
  created_by?: number;
}

// ============================================
// WhatsApp 账号相关类型
// ============================================

export enum AccountStatus {
  Stopped = 'stopped',
  Starting = 'starting',
  QR = 'qr',
  Ready = 'ready',
  Error = 'error',
}

export interface WhatsAppUserInfo {
  server: string;
  user: string;
  _serialized: string;
}

export interface WhatsAppAccount {
  id: number;
  account_name: string;
  phone_number: string;
  run_status: number;
  error_message?: string;
  last_start_time?: number;
  created_at: number;
  updated_at: number;
  enterprise_id: number;
}

export interface CreateAccountRequest {
  account_name: string;
  phone_number: string;
}

export interface CreateAccountResponse {
  id: number;
  account_name: string;
  phone_number: string;
  run_status: number;
  error_message?: string;
  last_start_time?: number;
  created_at: number;
  updated_at: number;
  enterprise_id: number;
}

export interface UpdateAccountRequest {
  account_name?: string;
}

// ============================================
// 消息历史相关类型
// ============================================

export interface SendMessageResult {
  to: string;
  message: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface MessageRecord {
  id: number;
  whatsapp_account_id: number;
  operator_id: number;
  to_phone: string;
  message_content: string;
  status: number;
  error_message?: string;
  sent_at?: number;
  created_at: number;
  updated_at: number;
}

export interface CreateMessageRequest {
  to_phone: string;
  message_content: string;
}

export interface CreateMessageResponse {
  id: number;
}

// ============================================
// Tab 相关类型
// ============================================

export interface Tab {
  id: string;
  title: string;
  closable: boolean;
}

export interface TabCreateInfo {
  id: string;
  title: string;
}

// ============================================
// 通用类型
// ============================================

export interface APIError {
  code: number;
  message: string;
  details?: any;
}

export class HTTPError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: APIError,
    message?: string
  ) {
    super(message || data?.message || `HTTP Error: ${status} ${statusText}`);
    this.name = 'HTTPError';
  }
}
