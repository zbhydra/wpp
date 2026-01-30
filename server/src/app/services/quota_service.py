"""配额管理服务 - 基于订阅层级的每日下载配额检查"""

from typing import Optional

from app.api.user_dependencies import UserContext
from app.core.redis import redis_client
from app.core.singleton import singleton
from app.services.subscription_service import subscription_service
from app.utils.logger import logger
from app.utils.redis_key import build_redis_key
from app.utils.time import get_today_date


# Lua 脚本：原子性配额检查与增加（支持批量）
_CHECK_AND_INCR_QUOTA_SCRIPT = """
local reset_key = KEYS[1]
local counter_key = KEYS[2]
local daily_limit = tonumber(ARGV[1])
local today_date = ARGV[2]
local count = tonumber(ARGV[3]) or 1

-- 无限制检查（-1 表示无限制）
if daily_limit == -1 then
    return {0, -1, count}  -- {当前计数, -1表示无限制, 实际消耗}
end

-- 获取上次重置日期
local last_reset = redis.call('GET', reset_key)

-- 如果日期已变更，重置计数器
if last_reset ~= today_date then
    redis.call('SET', reset_key, today_date)
    redis.call('SET', counter_key, 0)
    redis.call('EXPIRE', reset_key, 86400 * 2)  -- 2天过期
    redis.call('EXPIRE', counter_key, 86400 * 2)
    -- 检查批量是否超限
    if count > daily_limit then
        return {0, 0, 0}  -- 不满足批量需求
    end
    -- 增加批量计数
    local new_value = redis.call('INCRBY', counter_key, count)
    redis.call('EXPIRE', counter_key, 86400 * 2)
    return {new_value, daily_limit - new_value, count}
end

-- 获取当前计数
local current = tonumber(redis.call('GET', counter_key)) or 0

-- 检查批量是否超限
if current + count > daily_limit then
    return {current, 0, 0}  -- 不满足批量需求
end

-- 增加批量计数
local new_value = redis.call('INCRBY', counter_key, count)
redis.call('EXPIRE', counter_key, 86400 * 2)

return {new_value, daily_limit - new_value, count}
"""


@singleton
class QuotaService:
    """
    配额管理服务

    职责：
    - 检查用户下载配额是否充足
    - 记录每日下载次数
    - 自动处理每日重置（懒重置机制）
    """

    def __init__(self):
        self._reset_cache_enabled = True

    async def check_and_consume_quota(
        self,
        user_context: Optional[UserContext],
        count: int = 1,
    ) -> tuple[bool, int, int]:
        """
        检查并消耗配额

        Args:
            user_context: 用户上下文（None 表示匿名用户）
            count: 需要消耗的配额数量（批量下载时 >1）

        Returns:
            (是否允许, 当日已用次数, 剩余配额)
            注意：remaining = -1 表示无限制

        Raises:
            ValueError: count 参数非法
        """
        if count <= 0:
            raise ValueError("count must be positive")
        if count > 10000:
            raise ValueError("count too large")

        # 获取用户订阅配置
        user_id = user_context.user_id if user_context else 0
        subscription, config = await subscription_service.get_user_subscription_config(
            user_id
        )
        daily_limit = config.daily_download_limit

        # 无限制用户直接放行
        if daily_limit == -1:
            return True, 0, -1

        # 构建 Redis key
        reset_key, counter_key = self._build_redis_keys(user_context)

        # 获取今日日期（使用系统时区）
        today = get_today_date()

        try:
            redis = await redis_client.get_client()
            result = await redis.eval(  # type: ignore[misc]
                _CHECK_AND_INCR_QUOTA_SCRIPT,
                2,
                reset_key,
                counter_key,
                daily_limit,
                today,
                count,
            )

            if result is None:
                logger.error("Redis quota check failed")
                # fail-open：允许请求，但记录错误
                return True, 0, daily_limit

            used, remaining, consumed = result
            used_int, remaining_int, consumed_int = (
                int(used),
                int(remaining),
                int(consumed),
            )

            # 检查是否允许（consumed == count 表示成功消耗了配额）
            # Lua 脚本超限时返回 {current, 0, 0}，其中 consumed = 0
            # Lua 脚本成功时返回 {new_value, remaining, count}，其中 consumed = count
            allowed = consumed_int == count

            if not allowed:
                # Lua 脚本原子性保证，无需回退
                return False, used_int, 0

            return True, used_int, remaining_int

        except Exception as e:
            logger.error(f"Quota check error: {e}")
            # fail-open：允许请求
            return True, 0, daily_limit

    def _build_redis_keys(
        self,
        user_context: Optional[UserContext],
    ) -> tuple[str, str]:
        """构建配额相关的 Redis key

        Args:
            user_context: 用户上下文，None 表示匿名用户

        Raises:
            ValueError: user_context 为 None 且没有 device_id 时抛出

        Note:
            - 已登录用户: quota:daily:authenticated:{user_id}
            - 游客: quota:daily:anonymous:{device_id}
        """
        if user_context is None:
            raise ValueError("user_context cannot be None")

        if user_context.user_id == 0:
            # 游客：使用 device_id
            if not user_context.device_id:
                raise ValueError("device_id is required for anonymous users")
            user_type = "anonymous"
            identifier = user_context.device_id
        else:
            # 已登录用户：使用 user_id
            user_type = "authenticated"
            identifier = str(user_context.user_id)

        base = f"quota:daily:{user_type}:{identifier}"
        counter_key = build_redis_key(base)
        reset_key = build_redis_key(f"quota:reset_date:{user_type}:{identifier}")

        return reset_key, counter_key

    async def get_user_daily_used(self, user_id: int) -> int:
        """获取用户每日已用次数"""
        # 从 Redis 获取已用次数
        counter_key = build_redis_key(f"quota:daily:authenticated:{user_id}")
        try:
            redis = await redis_client.get_client()
            cached_used = await redis.get(counter_key)
            used = int(cached_used) if cached_used else 0
            return used
        except Exception:
            return 0

    async def get_daily_used_with_context(
        self, user_context: Optional[UserContext]
    ) -> int:
        """
        基于 UserContext 获取每日已用次数

        Args:
            user_context: 用户上下文

        Returns:
            已使用次数

        Raises:
            ValueError: user_context 为 None 且没有 device_id 时抛出

        Note:
            - 已登录用户: quota:daily:authenticated:{user_id}
            - 游客: quota:daily:anonymous:{device_id}
        """
        if user_context is None:
            raise ValueError("user_context cannot be None")

        if user_context.user_id == 0:
            # 游客：使用 device_id
            if not user_context.device_id:
                raise ValueError("device_id is required for anonymous users")
            counter_key = build_redis_key(
                f"quota:daily:anonymous:{user_context.device_id}"
            )
        else:
            # 已登录用户：使用 user_id
            counter_key = build_redis_key(
                f"quota:daily:authenticated:{user_context.user_id}"
            )

        try:
            redis = await redis_client.get_client()
            cached_used = await redis.get(counter_key)
            used = int(cached_used) if cached_used else 0
            return used
        except Exception:
            return 0


# 全局实例
quota_service = QuotaService()
