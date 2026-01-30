from dataclasses import asdict, dataclass
from datetime import timedelta
from typing import Any, Dict, Optional, Tuple
import uuid

import jwt

from app.constants.auth import TokenType
from app.core.config import settings
from app.utils.logger import logger
from app.utils.time import timestamp_now


@dataclass
class JwtData:
    """JWT 数据"""

    user_id: int
    email: str
    exp: int = 0  # 时间戳 毫秒
    type: TokenType = TokenType.USER_ACCESS
    jti: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)


class JwtUnit:
    """JWT 工具类"""

    @staticmethod
    def create_access_token(
        data: JwtData,
        expires_delta: Optional[timedelta] = None,
    ) -> Tuple[str, int]:
        """创建访问令牌"""

        if expires_delta:
            expire = timestamp_now() + int(expires_delta.total_seconds() * 1000)
        else:
            expire = timestamp_now() + settings.auth.access_token_expire * 1000

        data.exp = expire
        data.type = TokenType.USER_ACCESS
        data.jti = str(uuid.uuid4())
        encoded_jwt = jwt.encode(  # type: ignore[attr-defined]
            data.to_dict(),
            settings.auth.jwt_secret_key,
            algorithm=settings.auth.jwt_algorithm,
        )
        return encoded_jwt, expire

    @staticmethod
    def create_refresh_token(
        data: JwtData,
        expires_delta: Optional[timedelta] = None,
    ) -> Tuple[str, int]:
        """创建刷新令牌"""

        if expires_delta:
            expire = timestamp_now() + int(expires_delta.total_seconds() * 1000)
        else:
            expire = timestamp_now() + settings.auth.refresh_token_expire * 1000

        data.exp = expire
        data.type = TokenType.USER_REFRESH
        data.jti = str(uuid.uuid4())

        encoded_jwt = jwt.encode(  # type: ignore[attr-defined]
            data.to_dict(),
            settings.auth.jwt_secret_key,
            algorithm=settings.auth.jwt_algorithm,
        )
        return encoded_jwt, expire

    @staticmethod
    def decode_token(token: str) -> Optional[JwtData]:
        """解码令牌"""
        try:
            payload = jwt.decode(  # type: ignore[attr-defined]
                token,
                settings.auth.jwt_secret_key,
                algorithms=[settings.auth.jwt_algorithm],
            )
            jwt_data = JwtData(**payload) if payload else None
            if not jwt_data or jwt_data.user_id < 1:
                return None
            return jwt_data
        except Exception as e:
            logger.error(f"Failed to decode token: {e}")
            return None
