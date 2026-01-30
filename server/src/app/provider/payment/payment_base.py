"""支付网关抽象基类"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from fastapi import Request


@dataclass
class PaymentRequest:
    """支付请求"""

    order_no: str
    amount_cents: int
    currency: str
    product_name: str
    callback_url: str
    client_ip: Optional[str] = None


@dataclass
class PaymentResponse:
    """支付响应"""

    success: bool
    callback_url: Optional[str] = None  # 回调URL
    channel_order_no: Optional[str] = None  # 渠道订单号
    error_message: Optional[str] = None


@dataclass
class CallbackVerificationResult:
    """回调验证结果"""

    valid: bool
    order_no: Optional[str] = None
    channel_order_no: Optional[str] = None
    amount_cents: Optional[int] = None
    transaction_id: Optional[str] = None
    error_message: Optional[str] = None


class PaymentBase(ABC):
    """支付提供者抽象基类"""

    provider_name: str = ""

    def __init__(self, config: Optional[dict] = None) -> None:
        pass

    @abstractmethod
    async def create_payment(self, request: PaymentRequest) -> PaymentResponse:
        """创建支付

        Args:
            request: 支付请求

        Returns:
            PaymentResponse: 支付响应，包含支付URL或错误信息
        """
        pass

    @abstractmethod
    async def verify_callback(self, request: Request) -> CallbackVerificationResult:
        """验证支付回调签名和数据

        Args:
            request: FastAPI Request 对象

        Returns:
            CallbackVerificationResult: 验证结果
        """
        pass
