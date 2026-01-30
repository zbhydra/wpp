"""客户端用户认证相关的数据模型"""

from pydantic import BaseModel, EmailStr, Field


class UserInfo(BaseModel):
    """用户信息"""

    user_id: int = Field(..., description="用户ID")
    email: str | None = Field(None, description="邮箱")
    full_name: str | None = Field(None, description="全名")
    avatar_url: str | None = Field(None, description="头像URL")
    created_at: int = Field(..., description="创建时间戳")


class RegisterRequest(BaseModel):
    """注册请求"""

    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=6, max_length=100, description="密码")
    full_name: str | None = Field(None, max_length=100, description="全名")


class LoginRequest(BaseModel):
    """登录请求"""

    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=1, description="密码")


class LoginResponse(BaseModel):
    """登录响应"""

    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="访问令牌过期时间（秒）")
    user: UserInfo = Field(..., description="用户信息")


class LogoutResponse(BaseModel):
    """登出响应"""

    message: str = Field(default="注销成功", description="响应消息")


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""

    refresh_token: str = Field(..., description="刷新令牌")


class RefreshTokenResponse(BaseModel):
    """刷新令牌响应"""

    access_token: str = Field(..., description="新的访问令牌")
    refresh_token: str = Field(..., description="新的刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="访问令牌过期时间（秒）")


class SendEmailVerifyRequest(BaseModel):
    """发送邮箱验证码请求"""

    email: EmailStr = Field(..., description="邮箱地址")


class EmailVerifyLoginRequest(BaseModel):
    """邮箱验证码登录/注册请求"""

    email: EmailStr = Field(..., description="邮箱地址")
    code: str = Field(..., min_length=6, max_length=6, description="验证码")


class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str = Field(..., description="响应消息")
