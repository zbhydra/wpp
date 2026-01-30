from typing import Optional
from app.provider.payment.payment_base import (
    CallbackVerificationResult,
    PaymentBase,
    PaymentRequest,
    PaymentResponse,
)
from fastapi import Request


class PaymentMock(PaymentBase):
    """模拟支付提供者"""

    provider_name = "mock"

    def __init__(self, config: Optional[dict] = None) -> None:
        self.config = config or {}

    async def create_payment(self, request: PaymentRequest) -> PaymentResponse:
        """创建支付"""
        return PaymentResponse(success=True, callback_url="https://mock.payment.com")

    async def verify_callback(self, request: Request) -> CallbackVerificationResult:
        """验证支付回调"""
        return CallbackVerificationResult(valid=True)
