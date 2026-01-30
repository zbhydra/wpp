"""订阅周期常量和配置"""

import enum
from dataclasses import dataclass


class SubscriptionPeriodEnum(str, enum.Enum):
    """订阅周期枚举"""

    FREE = "free"
    MONTH = "month"
    QUARTER = "quarter"
    LIFETIME = "lifetime"


@dataclass(frozen=True)
class SubscriptionConfig:
    """订阅配置"""

    display_name: str
    daily_download_limit: int  # -1 表示无限制
    description: str
    price_cents: int = 0  # 价格（美分）


# 订阅配置（按周期划分）
SUBSCRIPTION_CONFIGS: dict[SubscriptionPeriodEnum, SubscriptionConfig] = {
    SubscriptionPeriodEnum.FREE: SubscriptionConfig(
        display_name="免费版",
        daily_download_limit=5,
        description="每日 5 次下载，仅公开群组和频道",
        price_cents=0,
    ),
    SubscriptionPeriodEnum.MONTH: SubscriptionConfig(
        display_name="月度订阅",
        daily_download_limit=-1,  # 无限制
        description="按月订阅，无下载限制",
        price_cents=999,  # $9.99
    ),
    SubscriptionPeriodEnum.QUARTER: SubscriptionConfig(
        display_name="季度订阅",
        daily_download_limit=-1,  # 无限制
        description="按季度订阅，无下载限制",
        price_cents=1999,  # $19.99
    ),
    SubscriptionPeriodEnum.LIFETIME: SubscriptionConfig(
        display_name="终身订阅",
        daily_download_limit=-1,  # 无限制
        description="终身买断，无下载限制",
        price_cents=9999,  # $99.99
    ),
}


def get_subscription_config(period: SubscriptionPeriodEnum) -> SubscriptionConfig:
    """获取订阅配置，不存在则返回免费版配置"""
    return SUBSCRIPTION_CONFIGS.get(
        period, SUBSCRIPTION_CONFIGS[SubscriptionPeriodEnum.FREE]
    )


# 免费用户额外配置键名（用于 config.yaml）
FREE_USER_CONFIG_KEY = "FREE_USER_DAILY_DOWNLOAD_LIMIT"
