"""客户端用户认证 API（注册、登录等）"""

from sqlalchemy.exc import IntegrityError

from fastapi import APIRouter, Depends, Request, status

# Services
from app.services.email_verification_service import (
    SendResult,
    email_verification_service,
)
from app.services.user_auth_service import user_auth_service
from app.services.user_service import user_service
from app.services.user_token_service import user_token_service

# Utils
from app.utils.ip_block_manager import IPBlockManager
from app.utils.jwt import JwtUnit
from app.utils.logger import logger
from app.utils.redis_fixed_limiter import RedisFixedLimiter
from app.utils.response import ResponseUtils

# API & Models
from app.api.user_dependencies import (
    UserContext,
    get_current_user,
    get_current_user_optional,
)
from app.constants.auth import (
    HTTP_AUTH_BEARER_PREFIX,
    HTTP_AUTH_BEARER_PREFIX_LENGTH,
    IP_BLOCK_DURATION,
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    LOGIN_RATE_LIMIT_WINDOW,
    MESSAGE_VERIFY_CODE_SENT,
    TokenType,
    UserLoginStatus,
)
from app.exceptions.common_exception import AppCommonException
from app.i18n.common_code import CommonCode
from app.i18n.dependencies import DEFAULT_LANGUAGE
from app.models import UserModel
from app.schemas.client_user_schema import (
    EmailVerifyLoginRequest,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    SendEmailVerifyRequest,
)

router = APIRouter(prefix="/auth", tags=["用户认证"])

# 限流器和 IP 封禁管理器实例
_rate_limiter = RedisFixedLimiter(key_prefix="login_rate_limit")
_ip_block_manager = IPBlockManager(key_prefix="ip_block")


async def _complete_login_flow(user: UserModel, request: Request) -> LoginResponse:
    """完成登录后的通用流程（生成Token、创建会话、更新登录信息）.

    Args:
        user: 用户对象
        request: FastAPI 请求对象

    Returns:
        LoginResponse: 登录响应
    """
    # 生成 Token
    access_token, refresh_token, expires_in = user_auth_service.create_tokens_for_user(
        user,
    )

    # 创建会话
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    await user_auth_service.create_user_session(
        user,
        access_token,
        refresh_token,
        ip_address,
        user_agent,
    )

    # 更新登录信息
    await user_auth_service.update_user_login_info(user)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type=TokenType.BEARER.value,
        expires_in=expires_in,
        user=user.to_user_info(),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest):
    """用户注册.

    1. 检查邮箱是否已存在
    2. 创建用户
    3. 返回用户信息
    """

    # 检查邮箱是否已存在
    existing = await user_service.get_user_by_email(data.email)
    if existing:
        raise AppCommonException(code=CommonCode.USER_EMAIL_EXISTS)

    # 创建用户
    user = await user_service.create_user(
        email=data.email,
        password=data.password,
        full_name=data.full_name,
    )

    return ResponseUtils.ok(user.to_user_info().model_dump())


@router.post("/login")
async def login(data: LoginRequest, request: Request):
    """用户登录.

    1. 检查 IP 是否被封禁
    2. 检查登录失败频率限制
    3. 验证邮箱和密码
    4. 生成 Token 并创建会话
    """
    # 获取客户端 IP
    ip_address = request.client.host if request.client else "unknown"

    # 检查 IP 是否被封禁
    if await _ip_block_manager.is_blocked(ip_address):
        remaining_time = await _ip_block_manager.get_remaining_time(ip_address)
        logger.warning(
            f"Blocked IP {ip_address} attempted login, remaining: {remaining_time}s",
        )
        raise AppCommonException(code=CommonCode.AUTH_IP_BLOCKED)

    # 验证用户凭据
    user = await user_auth_service.authenticate_user(data.email, data.password)
    if not user:
        # 检查并更新失败次数限制
        allowed = await _rate_limiter.is_allowed(
            identifier=ip_address,
            limit=LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
            window=LOGIN_RATE_LIMIT_WINDOW,
        )

        if not allowed:
            # 超过限制，封禁 IP
            await _ip_block_manager.block(ip_address, IP_BLOCK_DURATION)
            logger.warning(
                f"IP {ip_address} exceeded login rate limit, "
                f"blocked for {IP_BLOCK_DURATION}s",
            )
            raise AppCommonException(code=CommonCode.AUTH_IP_BLOCKED)

        await user_auth_service.update_failed_login(data.email)
        raise AppCommonException(code=CommonCode.AUTH_INVALID_CREDENTIALS)

    status = user.user_status()
    if status == UserLoginStatus.LOCKED:
        raise AppCommonException(code=CommonCode.AUTH_ACCOUNT_LOCKED)
    if status == UserLoginStatus.DELETED:
        raise AppCommonException(code=CommonCode.USER_NOT_FOUND)

    login_response = await _complete_login_flow(user, request)
    return ResponseUtils.ok(
        {
            "access_token": login_response.access_token,
            "refresh_token": login_response.refresh_token,
            "token_type": login_response.token_type,
            "expires_in": login_response.expires_in,
            "user": login_response.user.model_dump(),
        }
    )


@router.post("/logout")
async def logout(ctx: UserContext = Depends(get_current_user), request: Request = None):
    """用户登出（只撤销当前 token，不影响其他设备）."""
    if request:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith(HTTP_AUTH_BEARER_PREFIX):
            token = auth_header[HTTP_AUTH_BEARER_PREFIX_LENGTH:]
            await user_token_service.revoke_token(
                token, ctx.user_id, TokenType.USER_ACCESS
            )

    return ResponseUtils.ok({})


@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest):
    """刷新访问令牌（带 Refresh Token 轮换）.

    流程：
    1. 验证旧的 refresh token（支持宽限期内的旧 token）
    2. 验证用户身份和状态
    3. 生成新的 access token 和 refresh token
    4. 执行 refresh token 轮换（旧 token 移入宽限期 ZSet）
    5. 返回新的 token 对

    宽限期策略：
    - 旧 refresh token 在轮换后保留 30 秒
    - 在此期间内，客户端可以使用旧 token 进行刷新（处理并发请求）
    """
    jwt_data = JwtUnit.decode_token(data.refresh_token)
    if not jwt_data:
        raise AppCommonException(code=CommonCode.AUTH_INVALID_CREDENTIALS)

    user = await user_service.get_by_id(jwt_data.user_id)
    if not user:
        raise AppCommonException(code=CommonCode.USER_NOT_FOUND)

    status = user.user_status()
    if status == UserLoginStatus.LOCKED:
        raise AppCommonException(code=CommonCode.AUTH_ACCOUNT_LOCKED)
    if status == UserLoginStatus.DELETED:
        raise AppCommonException(code=CommonCode.USER_NOT_FOUND)

    ok = await user_token_service.verify_refresh_token_with_grace_period(
        data.refresh_token,
        jwt_data.user_id,
    )
    if not ok:
        raise AppCommonException(code=CommonCode.AUTH_INVALID_CREDENTIALS)

    new_access_token, new_refresh_token, expires_in = (
        user_auth_service.create_tokens_for_user(user)
    )

    new_refresh_jwt_data = JwtUnit.decode_token(new_refresh_token)
    new_refresh_expires_at = new_refresh_jwt_data.exp if new_refresh_jwt_data else 0

    rotation_success = await user_token_service.rotate_refresh_token(
        old_refresh_token=data.refresh_token,
        new_refresh_token=new_refresh_token,
        user_id=jwt_data.user_id,
        new_expires_at=new_refresh_expires_at,
    )

    if not rotation_success:
        logger.error(f"Failed to rotate refresh token for user_id={jwt_data.user_id}")

    await user_auth_service.token_ops.store_token(
        new_access_token,
        jwt_data.user_id,
        TokenType.USER_ACCESS,
        jwt_data.exp,
    )

    return ResponseUtils.ok(
        {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": TokenType.BEARER.value,
            "expires_in": expires_in,
        }
    )


@router.get("/me")
async def get_me(ctx: UserContext = Depends(get_current_user)):
    """获取当前用户信息."""

    user = await user_service.get_by_id(ctx.user_id)
    if not user:
        raise AppCommonException(code=CommonCode.USER_NOT_FOUND)

    return ResponseUtils.ok(user.to_user_info().model_dump())


@router.post("/send-email-code")
async def send_email_verify_code(
    data: SendEmailVerifyRequest,
    ctx: UserContext = Depends(get_current_user_optional),
):
    """发送邮箱验证码.

    1. 检查发送频率限制 (1分钟1次)
    2. 生成6位数字验证码
    3. 存储到 Redis (10分钟过期)
    4. 发送邮件 (重试3次)
    """
    # 获取语言设置：已登录用户使用 UserContext.language，未登录使用默认语言
    language = ctx.language if ctx else DEFAULT_LANGUAGE

    result = await email_verification_service.send_verify_code(data.email, language)

    if result == SendResult.RATE_LIMITED:
        raise AppCommonException(code=CommonCode.EMAIL_VERIFY_SEND_TOO_FREQUENT)
    if result == SendResult.SEND_FAILED:
        raise AppCommonException(code=CommonCode.EMAIL_VERIFY_SEND_FAILED)

    return ResponseUtils.ok({"message": MESSAGE_VERIFY_CODE_SENT})


@router.post("/email-verify-login")
async def email_verify_login(data: EmailVerifyLoginRequest, request: Request):
    """邮箱验证码登录/注册.

    1. 验证验证码 (最多5次)
    2. 如果用户不存在 -> 自动注册
    3. 如果用户存在 -> 直接登录
    4. 生成 Token 并创建会话
    """
    # 验证验证码
    is_valid = await email_verification_service.verify_code(data.email, data.code)
    if not is_valid:
        raise AppCommonException(code=CommonCode.EMAIL_VERIFY_CODE_INVALID)

    # 获取用户，不存在则创建（带并发保护）
    user = await user_service.get_user_by_email(data.email)
    if not user:
        try:
            user = await user_service.create_user_without_password(
                email=data.email,
                full_name=None,
            )
            logger.info(f"New user created via email verification: {data.email}")
        except IntegrityError:
            # 并发创建冲突，重新查询用户
            user = await user_service.get_user_by_email(data.email)
            if not user:
                # 理论上不应该发生，但作为保险
                logger.error(
                    f"Failed to create user after IntegrityError for {data.email}"
                )
                raise AppCommonException(code=CommonCode.INTERNAL_SERVER_ERROR)

    # 检查用户状态并完成登录
    status = user.user_status()
    if status == UserLoginStatus.LOCKED:
        raise AppCommonException(code=CommonCode.AUTH_ACCOUNT_LOCKED)
    if status == UserLoginStatus.DELETED:
        raise AppCommonException(code=CommonCode.USER_NOT_FOUND)

    login_response = await _complete_login_flow(user, request)
    return ResponseUtils.ok(
        {
            "access_token": login_response.access_token,
            "refresh_token": login_response.refresh_token,
            "token_type": login_response.token_type,
            "expires_in": login_response.expires_in,
            "user": login_response.user.model_dump(),
        }
    )
