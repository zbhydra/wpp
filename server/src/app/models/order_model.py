"""订单数据模型"""

from typing import Optional

from sqlalchemy import BigInteger, Integer, String, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.constants.order import OrderStatus, CallbackStatus
from app.models.base import BaseDBModel
from app.utils.time import timestamp_now


class OrderModel(BaseDBModel):
    """订单表"""

    __tablename__ = "orders"

    # 主键
    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True, comment="订单ID"
    )
    order_no: Mapped[str] = mapped_column(
        String(32), unique=True, nullable=False, comment="订单号（业务唯一标识）"
    )

    # 用户信息
    user_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, index=True, comment="用户ID"
    )

    # 商品信息
    product_class: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="商品类别（枚举值）"
    )
    product_id: Mapped[str] = mapped_column(
        String(64), nullable=False, comment="商品ID（业务系统定义）"
    )
    product_name: Mapped[str] = mapped_column(
        String(128), nullable=False, comment="商品名称（快照）"
    )

    # 金额信息
    cash: Mapped[int] = mapped_column(Integer, nullable=False, comment="订单现金金额")
    currency: Mapped[str] = mapped_column(
        String(8), nullable=False, default="USD", comment="货币类型"
    )

    # 状态信息
    order_status: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=OrderStatus.PENDING.value,
        comment="订单状态",
    )
    callback_status: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=CallbackStatus.NOT_CALLED.value,
        comment="业务回调状态",
    )

    # 支付信息
    payment_method: Mapped[Optional[str]] = mapped_column(
        String(32), comment="支付方式"
    )
    payment_channel_order_no: Mapped[Optional[str]] = mapped_column(
        String(128), comment="支付渠道订单号"
    )

    # 时间戳（毫秒）
    created_at: Mapped[int] = mapped_column(
        BigInteger,
        default=timestamp_now,
        nullable=False,
        comment="创建时间（毫秒时间戳）",
    )
    updated_at: Mapped[int] = mapped_column(
        BigInteger,
        default=timestamp_now,
        nullable=False,
        comment="更新时间（毫秒时间戳）",
    )
    paid_at: Mapped[Optional[int]] = mapped_column(
        BigInteger, comment="支付时间（毫秒时间戳）"
    )
    expired_at: Mapped[int] = mapped_column(
        BigInteger, nullable=False, comment="订单过期时间（毫秒时间戳）"
    )

    # 其他
    client_ip: Mapped[Optional[str]] = mapped_column(String(64), comment="客户端IP")
    extra_metadata: Mapped[Optional[str]] = mapped_column(
        Text, comment="扩展元数据（JSON）"
    )

    # 索引
    __table_args__ = (Index("idx_order_no", "order_no"),)

    def __repr__(self) -> str:
        return (
            f"<Order(id={self.id}, order_no='{self.order_no}', "
            f"user_id={self.user_id}, order_status='{self.order_status}')>"
        )
