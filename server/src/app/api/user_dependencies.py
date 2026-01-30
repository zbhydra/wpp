"""
用户认证和授权依赖项
"""

from dataclasses import dataclass
from typing import Optional

from app.utils.logger import logger

from app.constants.auth import TokenType
from app.i18n.dependencies import DEFAULT_LANGUAGE, SupportedLanguage
from app.services.user_token_service import user_token_service
from app.utils.common import get_client_ip
from app.utils.jwt import JwtUnit
from fastapi import Header, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.requests import Request
from app.utils.common import get_locale
from app.exceptions.common_exception import UserAuthFailedException


security = HTTPBearer()


@dataclass
class UserContext:
    """用户上下文"""

    user_id: int
    token: str
    device_id: Optional[str] = None
    language: SupportedLanguage = DEFAULT_LANGUAGE
    ip: Optional[str] = None

    async def check_strict(self):
        # 严格验证模式
        return await user_token_service.verify_token(
            self.token, self.user_id, token_type=TokenType.USER_ACCESS
        )


def _create_user_context(
    token: str,
    device_id: Optional[str] = None,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
    ip: Optional[str] = None,
) -> Optional[UserContext]:
    """
    验证 token 并创建 UserContext，验证失败返回 None

    注意：此函数只验证 token 签名和类型，不检查 Redis 中的撤销状态
    """
    jwt_data = JwtUnit.decode_token(token)
    if not jwt_data:
        return None

    user_id = jwt_data.user_id
    if user_id is None or not isinstance(user_id, int):
        return None

    token_type = jwt_data.type
    if token_type != TokenType.USER_ACCESS.value:
        return None

    return UserContext(
        user_id=user_id, token=token, device_id=device_id, language=language, ip=ip
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    request: Request = None,  # type: ignore[assignment]
) -> UserContext:
    """
    获取当前认证用户（包含 device_id 和 language）

    流程：
    1. 验证 Token 签名和过期时间
    2. 提取 userid（兼容旧的 sub）
    3. 验证 Token 是否被撤销或已过期（通过 Redis）
    4. 从 Accept-Language header 获取语言设置
    """
    token = credentials.credentials

    # 获取语言设置
    locale = get_locale(request) if request else None
    language = locale.language if locale else DEFAULT_LANGUAGE

    ip = get_client_ip(request) if request else None
    ctx = _create_user_context(token, device_id=x_device_id, language=language, ip=ip)
    if ctx is None:
        raise UserAuthFailedException("Invalid token")

    return ctx


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(
        HTTPBearer(auto_error=False)
    ),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    request: Request = None,  # type: ignore[assignment]
) -> Optional[UserContext]:
    """
    可选的用户认证依赖

    支持已登录和未登录用户：
    - 有有效 token: 返回 UserContext（已登录，user_id > 0）
    - 无 token 但有 device_id: 返回 UserContext（游客，user_id = 0）
    - 既无 token 也无 device_id: 抛出 UserAuthFailedException

    Returns:
        - UserContext: 总是返回 UserContext（已登录或游客）

    Raises:
        UserAuthFailedException: 既没有 token 也没有 device_id

    注意：此函数不检查 Redis 中的 token 撤销状态，仅验证 token 签名和类型
    """
    # 获取语言设置
    locale = get_locale(request) if request else None
    language = locale.language if locale else DEFAULT_LANGUAGE

    ip = get_client_ip(request) if request else None

    if credentials is None:
        # 没有 token：检查是否有 device_id（游客模式）
        if x_device_id:
            return UserContext(
                user_id=0, token="", device_id=x_device_id, language=language, ip=ip
            )
        logger.info(
            f"No token or device_id, returning anonymous user: {dict(request.headers) if request else 'no request'}"
        )
        # 既没有 token 也没有 device_id：抛出错误
        raise UserAuthFailedException("Either token or device_id is required")

    # 有 token：验证并创建 UserContext
    return _create_user_context(
        credentials.credentials, device_id=x_device_id, language=language, ip=ip
    )
