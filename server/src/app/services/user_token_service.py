"""
用户 Token 管理服务（基于 Redis Sorted Set）
"""

import hashlib

from app.core.redis import redis_client
from app.core.singleton import singleton
from app.constants.auth import (
    TokenType,
    REFRESH_TOKEN_GRACE_PERIOD_SECONDS,
)
from app.utils.redis_key import build_redis_key
from app.utils.time import timestamp_now
from app.utils.logger import logger


@singleton
class UserTokenService:
    """
    用户 Token 管理服务（Redis Sorted Set 存储）

    Redis 数据结构：
    - access_token:{user_id}  → ZSet [md5(token)=expires_at, ...]
    - refresh_token:{user_id} → ZSet [md5(token)=expires_at, ...]
    - refresh_token_old:{user_id} → ZSet [md5(old_token)=expires_at, ...] (宽限期)
    """

    def __init__(self):
        self._redis = redis_client

    def _build_key(self, token_type: TokenType, user_id: int) -> str:
        """构建 Redis Key"""
        if token_type == TokenType.USER_ACCESS:
            return build_redis_key(f"access_token:{user_id}")
        elif token_type == TokenType.USER_REFRESH:
            return build_redis_key(f"refresh_token:{user_id}")
        elif token_type == TokenType.USER_REFRESH_OLD:
            return build_redis_key(f"refresh_token_old:{user_id}")
        else:
            return build_redis_key(f"unknown_token_type:{user_id}")

    def _hash_token(self, token: str) -> str:
        """计算 Token 的 MD5 哈希（用于存储）"""
        return hashlib.md5(token.encode()).hexdigest()

    async def store_token(
        self,
        token: str,
        user_id: int,
        token_type: TokenType,
        expires_at: int,
    ) -> bool:
        """
        存储 Token 到 Redis Sorted Set

        Args:
            token: JWT Token 字符串
            user_id: 用户 ID
            token_type: Token 类型（ACCESS 或 REFRESH）
            expires_at: 过期时间（毫秒时间戳）

        Returns:
            是否存储成功
        """
        redis = await self._redis.get_client()
        token_hash = self._hash_token(token)
        key = self._build_key(token_type, user_id)

        await redis.zadd(key, {token_hash: expires_at})

        logger.debug(
            f"Stored token: user_id={user_id}, type={token_type}, expires_at={expires_at}"
        )
        return True

    async def verify_token(
        self,
        token: str,
        user_id: int,
        token_type: TokenType,
    ) -> bool:
        """
        验证 Token 是否有效（未过期且未被撤销）

        Args:
            token: JWT Token 字符串
            user_id: 用户 ID
            token_type: Token 类型

        Returns:
            Token 是否有效

        Raises:
            TokenExpiredError: Token 已过期
            TokenRevokedError: Token 已被撤销
        """
        redis = await self._redis.get_client()
        token_hash = self._hash_token(token)
        key = self._build_key(token_type, user_id)
        now = timestamp_now()

        expires_at = await redis.zscore(key, token_hash)

        if expires_at is None:
            return False

        expires_at_int = int(expires_at)

        if expires_at_int < now:
            await self.revoke_token(token, user_id, token_type)
            return False

        return True

    async def revoke_token(
        self,
        token: str,
        user_id: int,
        token_type: TokenType,
    ) -> bool:
        """
        撤销 Token（从 Redis 中删除）

        Args:
            token: JWT Token 字符串
            user_id: 用户 ID
            token_type: Token 类型

        Returns:
            是否撤销成功
        """
        redis = await self._redis.get_client()
        token_hash = self._hash_token(token)
        key = self._build_key(token_type, user_id)

        result = await redis.zrem(key, token_hash)

        logger.debug(
            f"Revoked token: user_id={user_id}, type={token_type}, result={result}"
        )
        return result > 0

    async def revoke_all_user_tokens(self, user_id: int) -> int:
        """
        撤销用户所有 Token（删除整个 ZSet）

        Args:
            user_id: 用户 ID

        Returns:
            删除的 Token 数量
        """

        redis = await self._redis.get_client()

        access_key = self._build_key(TokenType.USER_ACCESS, user_id)
        access_count = await redis.zcard(access_key)
        await redis.delete(access_key)

        refresh_key = self._build_key(TokenType.USER_REFRESH, user_id)
        refresh_count = await redis.zcard(refresh_key)
        await redis.delete(refresh_key)

        refresh_old_key = self._build_key(TokenType.USER_REFRESH_OLD, user_id)
        refresh_old_count = await redis.zcard(refresh_old_key)
        await redis.delete(refresh_old_key)

        total = access_count + refresh_count + refresh_old_count
        logger.info(f"Revoked all tokens for user_id={user_id}, total={total}")
        return total

    async def rotate_refresh_token(
        self,
        old_refresh_token: str,
        new_refresh_token: str,
        user_id: int,
        new_expires_at: int,
    ) -> bool:
        """
        轮换 Refresh Token（带宽限期）

        策略：
        1. 将旧 refresh token 移动到宽限期 ZSet（保留 30 秒）
        2. 存储新的 refresh token

        Args:
            old_refresh_token: 旧的 refresh token
            new_refresh_token: 新的 refresh token
            user_id: 用户 ID
            new_expires_at: 新 token 的过期时间（毫秒时间戳）

        Returns:
            是否轮换成功
        """

        redis = await self._redis.get_client()
        old_token_hash = self._hash_token(old_refresh_token)

        now = timestamp_now()
        grace_period_expires_at = now + (REFRESH_TOKEN_GRACE_PERIOD_SECONDS * 1000)

        refresh_key = self._build_key(TokenType.USER_REFRESH, user_id)
        refresh_old_key = self._build_key(TokenType.USER_REFRESH_OLD, user_id)

        pipe = redis.pipeline()

        pipe.zrem(refresh_key, old_token_hash)
        pipe.zadd(refresh_old_key, {old_token_hash: grace_period_expires_at})
        pipe.expire(refresh_old_key, REFRESH_TOKEN_GRACE_PERIOD_SECONDS)

        new_token_hash = self._hash_token(new_refresh_token)
        pipe.zadd(refresh_key, {new_token_hash: new_expires_at})

        await pipe.execute()

        logger.info(
            f"Rotated refresh token: user_id={user_id}, "
            f"grace_period_until={grace_period_expires_at}"
        )
        return True

    async def verify_refresh_token_with_grace_period(
        self,
        refresh_token: str,
        user_id: int,
    ) -> bool:
        """
        验证 Refresh Token（支持宽限期内的旧 Token）

        优先验证当前 Token，如果不存在则尝试验证宽限期内的旧 Token

        Args:
            refresh_token: Refresh Token 字符串
            user_id: 用户 ID

        Returns:
            Token 是否有效
        """

        ok = await self.verify_token(
            refresh_token,
            user_id,
            TokenType.USER_REFRESH,
        )
        if ok:
            return True

        redis = await self._redis.get_client()
        token_hash = self._hash_token(refresh_token)
        refresh_old_key = self._build_key(TokenType.USER_REFRESH_OLD, user_id)
        now = timestamp_now()

        expires_at = await redis.zscore(refresh_old_key, token_hash)

        if expires_at is None:
            return False

        expires_at_int = int(expires_at)

        if expires_at_int < now:
            await redis.zrem(refresh_old_key, token_hash)
            return False

        logger.info(f"Accepted old refresh token in grace period: user_id={user_id}")
        return True

    async def get_active_token_count(self, user_id: int, token_type: TokenType) -> int:
        """
        获取用户的活跃 Token 数量

        Args:
            user_id: 用户 ID
            token_type: Token 类型

        Returns:
            活跃 Token 数量
        """
        redis = await self._redis.get_client()
        key = self._build_key(token_type, user_id)
        count = await redis.zcard(key)
        return count


# 全局 Token 服务实例
user_token_service = UserTokenService()
