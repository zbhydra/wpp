/**
 * 认证 API
 */

import type { HTTPClient } from './client';
import type {
  UserInfo,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  SwitchEnterpriseRequest,
  SwitchEnterpriseResponse,
  LogoutResponse,
  RegisterRequest,
  CreateEnterpriseRequest,
  EnterpriseResponse,
} from '../types';

export class AuthAPI {
  constructor(private client: HTTPClient) {}

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<UserInfo> {
    return this.client.post<UserInfo>('/auth/register', data);
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', credentials);
    this.client.setToken(response.access_token);
    this.client.setRefreshToken(response.refresh_token, response.expires_in);
    return response;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(data: RefreshTokenRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/auth/refresh', data);
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserInfo> {
    return this.client.get<UserInfo>('/auth/me');
  }

  /**
   * 登出
   */
  async logout(): Promise<LogoutResponse> {
    const response = await this.client.post<LogoutResponse>('/auth/logout');
    this.client.setToken(null);
    this.client.clearRefreshTimer();
    return response;
  }

  /**
   * 切换企业
   */
  async switchEnterprise(data: SwitchEnterpriseRequest): Promise<SwitchEnterpriseResponse> {
    const response = await this.client.post<SwitchEnterpriseResponse>('/auth/switch-enterprise', data);
    this.client.setToken(response.access_token);
    this.client.setRefreshToken(response.refresh_token, response.expires_in);
    return response;
  }

  /**
   * 创建企业
   */
  async createEnterprise(data: CreateEnterpriseRequest): Promise<EnterpriseResponse> {
    return this.client.post<EnterpriseResponse>('/auth/enterprises', data);
  }
}
