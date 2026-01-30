"""支付提供者"""

from dataclasses import dataclass
import enum
from typing import Dict, Optional, Type

from app.core.singleton import singleton
from app.provider.payment.payment_base import PaymentBase
from app.provider.payment.payment_mock import PaymentMock


class PaymentProvider(str, enum.Enum):
    """支付方式常量"""

    MOCK = "mock"


@dataclass
class PaymentConfig:
    """支付配置"""

    provider_class: Type[PaymentBase]
    config: Optional[dict] = None


# 支付方式映射到实现类
PAYMENT_PROVIDERS: Dict[PaymentProvider, PaymentConfig] = {
    PaymentProvider.MOCK: PaymentConfig(provider_class=PaymentMock, config=None),
}


@singleton
class PaymentManage:
    """支付管理器"""

    _instances: Dict[PaymentProvider, PaymentBase] = {}

    def __init__(self) -> None:
        pass

    def create(self, payment_method: PaymentProvider) -> PaymentBase:
        """创建支付网关实例

        Args:
            payment_method: 支付方式字符串

        Returns:
            PaymentBase: 支付网关实例

        Raises:
            ValueError: 不支持的支付方式
        """
        instance = self._instances.get(payment_method)
        if instance:
            return instance

        provider_class = PAYMENT_PROVIDERS.get(payment_method)
        if not provider_class:
            raise ValueError(f"不支持的支付方式: {payment_method}")

        self._instances[payment_method] = provider_class.provider_class(
            provider_class.config
        )
        return self._instances[payment_method]

    def supported_methods(self) -> list[str]:
        """获取支持的支付方式列表"""
        return [provider.value for provider in PAYMENT_PROVIDERS.keys()]


# 全局实例
payment_manage = PaymentManage()
