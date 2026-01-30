"""订单系统常量定义"""

from dataclasses import dataclass
import enum
from typing import Optional


class ProductClass(int, enum.Enum):
    """商品类别枚举"""

    SUBSCRIPTION = 1  # 订阅商品
    RECHARGE = 2  # 充值商品
    EXTENSION = 3  # 扩展功能
    OTHER = 4  # 其他


class OrderStatus(int, enum.Enum):
    """订单状态枚举"""

    PENDING = 1  # 待支付
    PAID = 2  # 已支付
    CANCELLED = 3  # 已取消
    REFUNDED = 4  # 已退款
    EXPIRED = 5  # 已过期


class CallbackStatus(int, enum.Enum):
    """业务回调状态枚举"""

    NOT_CALLED = 1  # 未回调
    PENDING = 2  # 待回调
    SUCCESS = 3  # 回调成功
    FAILED = 4  # 回调失败
    MAX_RETRY = 5  # 超过最大重试次数


# 订单状态转换规则（状态机）
ORDER_STATE_TRANSITIONS: dict[OrderStatus, list[OrderStatus]] = {
    OrderStatus.PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
    OrderStatus.PAID: [OrderStatus.REFUNDED],
    OrderStatus.CANCELLED: [],  # 终态
    OrderStatus.REFUNDED: [],  # 终态
    OrderStatus.EXPIRED: [],  # 终态
}


@dataclass
class OrderCreateParam:
    """订单创建步骤"""

    user_id: int
    product_class: int
    product_id: str
    product_name: str
    cash: int
    payment_method: str
    currency: str = "USD"
    client_ip: Optional[str] = None


# Redis Key 前缀
REDIS_KEY_ORDER_CALLBACK_LOCK = "tg-download:order:callback:lock"
REDIS_KEY_ORDER_STATUS_CACHE = "tg-download:order:status"
REDIS_KEY_PAYMENT_TRANSACTION = "tg-download:payment:transaction"
