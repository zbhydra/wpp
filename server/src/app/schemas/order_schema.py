"""订单相关 Pydantic Schema"""

from typing import Optional

from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    """创建订单请求"""

    product_class: int = Field(..., ge=1, le=10, description="商品类别（枚举值）")
    product_id: str = Field(
        ..., min_length=1, max_length=64, description="商品ID（业务系统定义）"
    )
    product_name: str = Field(..., description="商品名称")
    cash: int = Field(..., description="订单金额分")


class CreateOrderResponse(BaseModel):
    """创建订单响应"""

    order_no: str = Field(..., description="订单号")
    payment_url: str = Field(..., description="支付跳转URL")
    amount_cents: int = Field(..., description="订单金额（美分）")
    currency: str = Field(..., description="货币类型")
    expired_at: int = Field(..., description="过期时间（毫秒时间戳）")


class OrderStatusResponse(BaseModel):
    """订单状态响应"""

    order_no: str
    product_name: str
    amount_cents: int
    currency: str
    order_status: str
    callback_status: str
    payment_method: Optional[str]
    paid_at: Optional[int]
    created_at: int


class OrderListResponse(BaseModel):
    """订单列表响应"""

    orders: list[OrderStatusResponse]
    total: int
    offset: int
    limit: int


class PaymentCallbackRequest(BaseModel):
    """支付回调请求（内部使用）"""

    order_no: str
    channel_order_no: str
    amount_cents: int
    transaction_id: Optional[str] = None
    callback_data: Optional[dict] = None
