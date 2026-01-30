"""用户订阅数据模型"""

from typing import Optional

from app.constants.subscription import SubscriptionPeriodEnum
from sqlalchemy import BigInteger, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseDBModel
from app.utils.time import timestamp_now


class UserSubscriptionModel(BaseDBModel):
    """用户订阅表"""

    __tablename__ = "user_subscriptions"

    user_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=False, comment="用户 ID"
    )
    period: Mapped[SubscriptionPeriodEnum] = mapped_column(
        String(20),
        nullable=False,
        default="free",
        comment="订阅周期: free/month/quarter/lifetime",
    )
    expires_at: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="订阅过期时间(毫秒时间戳), NULL表示永久",
    )
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

    # 索引
    __table_args__ = (Index("idx_period", "period"),)

    def __repr__(self) -> str:
        return f"<UserSubscription(user_id={self.user_id}, period='{self.period}', expires_at={self.expires_at})>"
