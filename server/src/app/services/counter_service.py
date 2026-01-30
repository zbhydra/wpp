"""
用户计数器服务 - 支持匿名和已登录用户的计数功能
"""

from typing import Optional

from app.constants.counter import (
    COUNTER_KEY_PREFIX,
    CounterType,
    UserType,
    get_counter_config,
)
from app.core.redis import redis_client
from app.core.singleton import singleton
from app.utils.redis_key import build_redis_key
from app.utils.logger import logger


# Lua 脚本：原子性地增加计数器并在首次设置时添加过期时间
_INCR_WITH_EXPIRE_SCRIPT = """
local current = redis.call('INCRBY', KEYS[1], ARGV[1])
if current == tonumber(ARGV[1]) then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
end
return current
"""

# Lua 脚本：原子性地合并匿名计数到用户计数
_MERGE_ANONYMOUS_SCRIPT = """
local anonymous_key = KEYS[1]
local user_key = KEYS[2]
local ttl = ARGV[1]

-- 获取匿名计数值
local anonymous_value = redis.call('GET', anonymous_key)
if anonymous_value then
    -- 累加到用户计数
    local new_value = redis.call('INCRBY', user_key, tonumber(anonymous_value))

    -- 只在必要时设置 TTL（避免重置较新的 TTL）
    -- -2: key 不存在，需要设置
    -- -1: key 存在但没有过期时间，不覆盖
    -- >= 0: key 有过期时间，只在当前 TTL 大于目标 TTL 时才延长
    local current_ttl = redis.call('TTL', user_key)
    if current_ttl == -2 or (current_ttl >= 0 and current_ttl > tonumber(ttl)) then
        redis.call('EXPIRE', user_key, ttl)
    end

    -- 删除匿名计数器
    redis.call('DEL', anonymous_key)

    return new_value
else
    -- 没有匿名计数，返回当前用户计数值
    local current_value = redis.call('GET', user_key)
    return current_value or 0
end
"""


@singleton
class CounterService:
    """
    用户计数器服务

    支持：
    - 匿名用户（通过 device_id）
    - 已登录用户（通过 user_id）
    - 登录时合并匿名计数器
    - 可配置的 TTL
    """

    def _validate_user_or_device(
        self,
        user_id: Optional[int],
        device_id: Optional[str],
    ) -> None:
        """
        验证至少提供了一个标识符

        Raises:
            ValueError: 当 user_id 和 device_id 都为空，或 device_id 不合法时
        """
        if user_id is None and device_id is None:
            raise ValueError("Either user_id or device_id must be provided")

        if device_id is not None:
            if not device_id:
                raise ValueError("device_id cannot be empty string")
            if len(device_id) > 256:
                raise ValueError("device_id too long (max 256 characters)")

    async def increment(
        self,
        counter_type: CounterType,
        user_id: Optional[int],
        device_id: Optional[str],
        delta: int = 1,
    ) -> int:
        """
        增加计数器

        Args:
            counter_type: 计数器类型
            user_id: 用户 ID（已登录用户）
            device_id: 设备 ID（匿名用户）
            delta: 增量，默认 1

        Returns:
            增加后的计数值

        Raises:
            ValueError: user_id 和 device_id 都为空，或 delta 不合法
            RuntimeError: Redis 操作失败
        """
        self._validate_user_or_device(user_id, device_id)

        if delta <= 0:
            raise ValueError("delta must be positive")
        if delta > 1_000_000:
            raise ValueError("delta too large")

        key = self._build_key(counter_type, user_id, device_id)
        config = get_counter_config(counter_type)

        try:
            redis = await redis_client.get_client()

            # 使用 Lua 脚本原子性地增加计数并设置过期时间
            result = await redis.eval(  # type: ignore[misc]
                _INCR_WITH_EXPIRE_SCRIPT, 1, key, delta, config.ttl_seconds
            )

            if result is None:
                raise RuntimeError("Redis INCRBY operation failed - connection error")

            return int(result)
        except Exception as e:
            logger.error(
                f"Counter increment failed: type={counter_type}, "
                f"user_id={user_id}, device_id={device_id}, error={e}"
            )
            raise

    async def get(
        self,
        counter_type: CounterType,
        user_id: Optional[int],
        device_id: Optional[str],
    ) -> int:
        """
        获取当前计数值

        注意：Redis 错误时返回 0（fail-open 策略）

        Args:
            counter_type: 计数器类型
            user_id: 用户 ID
            device_id: 设备 ID

        Returns:
            当前计数值（不存在或出错返回 0）
        """
        self._validate_user_or_device(user_id, device_id)

        key = self._build_key(counter_type, user_id, device_id)

        try:
            redis = await redis_client.get_client()
            value = await redis.get(key)
            return int(value) if value else 0
        except Exception as e:
            logger.error(
                f"Counter get failed: type={counter_type}, "
                f"user_id={user_id}, device_id={device_id}, error={e}"
            )
            return 0

    async def merge_anonymous_to_user(
        self,
        user_id: int,
        device_id: str,
        counter_types: Optional[list[CounterType]] = None,
    ) -> dict[CounterType, int]:
        """
        合并匿名用户计数到已登录用户

        使用 Lua 脚本保证原子性：
        1. 读取匿名计数值
        2. 累加到用户计数
        3. 只在必要时更新 TTL（不覆盖无 TTL 的 key）
        4. 删除匿名计数器

        Args:
            user_id: 目标用户 ID
            device_id: 源设备 ID
            counter_types: 要合并的计数器类型，None 表示全部

        Returns:
            合并后的计数值 {counter_type: merged_value}
        """
        if counter_types is None:
            counter_types = list(CounterType)

        redis = await redis_client.get_client()
        results = {}

        try:
            for counter_type in counter_types:
                anonymous_key = self._build_key(
                    counter_type, user_id=None, device_id=device_id
                )
                user_key = self._build_key(
                    counter_type, user_id=user_id, device_id=None
                )
                config = get_counter_config(counter_type)

                # 使用 Lua 脚本原子性地合并计数器
                result = await redis.eval(  # type: ignore[misc]
                    _MERGE_ANONYMOUS_SCRIPT,
                    2,
                    anonymous_key,
                    user_key,
                    config.ttl_seconds,
                )

                merged_value = int(result) if result is not None else 0
                results[counter_type] = merged_value

                # 只记录实际合并了数据的操作
                if merged_value > 0:
                    logger.info(
                        f"Merged anonymous counter: type={counter_type}, "
                        f"device_id={device_id}, user_id={user_id}, "
                        f"merged_value={merged_value}"
                    )

        except Exception as e:
            logger.error(
                f"Counter merge failed: user_id={user_id}, device_id={device_id}, error={e}"
            )
            raise

        return results

    async def reset(
        self,
        counter_type: CounterType,
        user_id: Optional[int],
        device_id: Optional[str],
    ) -> None:
        """
        重置计数器

        Args:
            counter_type: 计数器类型
            user_id: 用户 ID
            device_id: 设备 ID

        Raises:
            Exception: Redis 操作失败时抛出异常
        """
        self._validate_user_or_device(user_id, device_id)

        key = self._build_key(counter_type, user_id, device_id)

        try:
            redis = await redis_client.get_client()
            await redis.delete(key)
        except Exception as e:
            logger.error(
                f"Counter reset failed: type={counter_type}, "
                f"user_id={user_id}, device_id={device_id}, error={e}"
            )
            raise

    def _build_key(
        self,
        counter_type: CounterType,
        user_id: Optional[int],
        device_id: Optional[str],
    ) -> str:
        """
        构建 Redis key

        前置条件：至少提供了 user_id 或 device_id 之一
        """
        if user_id is not None:
            user_type = UserType.AUTHENTICATED
            identifier = str(user_id)
        else:
            user_type = UserType.ANONYMOUS
            # device_id 必须存在，因为调用者已经通过 _validate_user_or_device 验证
            assert device_id is not None
            identifier = device_id

        key = (
            f"{COUNTER_KEY_PREFIX}:{counter_type.value}:{user_type.value}:{identifier}"
        )
        return build_redis_key(key)

    async def get_all_counters(
        self,
        user_id: Optional[int],
        device_id: Optional[str],
    ) -> dict[CounterType, int]:
        """
        获取用户所有计数器的值

        使用 MGET 保证原子性，避免并发修改导致的不一致快照

        注意：Redis 错误时返回空字典（fail-open 策略）

        Args:
            user_id: 用户 ID
            device_id: 设备 ID

        Returns:
            {counter_type: value} 映射
        """
        self._validate_user_or_device(user_id, device_id)

        try:
            redis = await redis_client.get_client()

            # 构建所有 key
            keys = [
                self._build_key(counter_type, user_id, device_id)
                for counter_type in CounterType
            ]

            # 使用 MGET 原子性地获取所有值
            values = await redis.mget(*keys)

            results = {
                counter_type: int(v) if v else 0
                for counter_type, v in zip(CounterType, values)
            }

            return results
        except Exception as e:
            logger.error(
                f"Counter get_all failed: user_id={user_id}, device_id={device_id}, error={e}"
            )
            # 返回空字典而不是抛出异常（fail-open）
            return {ct: 0 for ct in CounterType}


# Global singleton instance
counter_service = CounterService()
