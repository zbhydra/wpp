/**
 * HTTP 客户端核心
 * 封装 HTTP 请求、Token 管理、错误处理
 */

import type { APIError, HTTPError as HTTPErrorType, RefreshTokenResponse } from '../types';

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

/**
 * HTTP 错误类
 */
export class HTTPError extends Error implements HTTPErrorType {
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

/**
 * HTTP 客户端核心类
 */
export class HTTPClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Token keys for localStorage
  private readonly TOKEN_KEY = 'client_token';
  private readonly REFRESH_TOKEN_KEY = 'client_refresh_token';

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem(this.TOKEN_KEY);
  }

  setRefreshToken(token: string, expiresInSeconds: number) {
    this.refreshToken = token;
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    this.scheduleTokenRefresh(expiresInSeconds * 1000);
  }

  getRefreshToken(): string | null {
    return this.refreshToken || localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private scheduleTokenRefresh(expireInMs: number) {
    this.clearRefreshTimer();
    // 在 token 过期前 5 分钟刷新
    const refreshDelay = Math.max(expireInMs - 5 * 60 * 1000, 60 * 1000);
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshDelay);
  }

  private async refreshAccessToken() {
    const refreshTk = this.getRefreshToken();
    if (!refreshTk) return;

    try {
      const response = await this.post<RefreshTokenResponse>('/auth/refresh', {
        refresh_token: refreshTk,
      });
      this.setToken(response.access_token);
      this.scheduleTokenRefresh(response.expires_in * 1000);
    } catch {
      // 刷新失败，清除 tokens 并跳转登录
      this.setToken(null);
      this.clearRefreshTimer();
      window.location.hash = '/login';
    }
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(API_BASE + endpoint);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit & { params?: Record<string, any> }
  ): Promise<T> {
    const url = this.buildURL(endpoint, options?.params);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': localStorage.getItem('language') || 'zh-cn',
    };

    if (options?.headers) {
      const headerInit = options.headers as Record<string, string>;
      Object.assign(headers, headerInit);
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: APIError | undefined;
      try {
        errorData = await response.json();
      } catch {
        // Ignore
      }

      // 401 未认证，清除 token
      if (response.status === 401) {
        this.setToken(null);
        this.clearRefreshTimer();
        window.location.hash = '/login';
      }

      throw new HTTPError(
        response.status,
        response.statusText,
        errorData,
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
