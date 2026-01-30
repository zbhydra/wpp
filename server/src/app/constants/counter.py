"""用户计数器类型定义和配置"""

import enum
from dataclasses import dataclass


# Redis key 前缀常量
COUNTER_KEY_PREFIX = "counter"


class CounterType(str, enum.Enum):
    """计数器类型枚举"""

    # 文件下载相关
    DOWNLOAD_COUNT = "download_count"
    DOWNLOAD_SIZE_TOTAL = "download_size_total"

    # API 调用相关
    API_CALL_COUNT = "api_call_count"

    # 用户行为
    PAGE_VIEW_COUNT = "page_view_count"
    SEARCH_COUNT = "search_count"


class UserType(str, enum.Enum):
    """用户类型枚举"""

    ANONYMOUS = "anonymous"
    AUTHENTICATED = "authenticated"


@dataclass(frozen=True)
class CounterConfig:
    """计数器配置"""

    ttl_seconds: int


# 计数器类型 -> 配置映射
COUNTER_CONFIGS: dict[CounterType, CounterConfig] = {
    # 下载计数：30 天过期
    CounterType.DOWNLOAD_COUNT: CounterConfig(ttl_seconds=30 * 86400),
    CounterType.DOWNLOAD_SIZE_TOTAL: CounterConfig(ttl_seconds=30 * 86400),
    # API 调用：7 天过期
    CounterType.API_CALL_COUNT: CounterConfig(ttl_seconds=7 * 86400),
    # 用户行为：1 天过期
    CounterType.PAGE_VIEW_COUNT: CounterConfig(ttl_seconds=86400),
    CounterType.SEARCH_COUNT: CounterConfig(ttl_seconds=86400),
}


def get_counter_config(counter_type: CounterType) -> CounterConfig:
    """获取计数器配置，不存在则返回默认值"""
    return COUNTER_CONFIGS.get(
        counter_type,
        CounterConfig(ttl_seconds=7 * 86400),  # 默认 7 天
    )
