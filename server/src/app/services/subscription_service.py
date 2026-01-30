"""订阅管理服务"""

from datetime import timedelta
from typing import Optional

from app.constants.subscription import (
    SubscriptionConfig,
    SubscriptionPeriodEnum,
    get_subscription_config,
)
from app.core.singleton import singleton
from app.models.order_model import OrderModel
from app.models.subscription_model import UserSubscriptionModel
from app.services.base_service import BaseService
from app.utils.logger import logger
from app.utils.time import timestamp_now, timestamp_now_datetime


@singleton
class SubscriptionService(BaseService[UserSubscriptionModel]):
    """订阅管理服务"""

    primary_key_field = "user_id"

    def __init__(self):
        super().__init__(UserSubscriptionModel)

    async def get_user_subscription(self, user_id: int) -> UserSubscriptionModel:
        """
        获取用户订阅周期

        默认返回 'free'，无需显式创建记录
        """
        subscription = await self.get_by_id(user_id)
        logger.info(subscription)
        if subscription:
            # 检查是否未过期（< 表示未过期）
            if subscription.expires_at and subscription.expires_at > timestamp_now():
                return subscription

        # logger.info("fuck")
        return UserSubscriptionModel(
            user_id=user_id,
            period=SubscriptionPeriodEnum.FREE,
            expires_at=None,
        )

    async def update_user_subscription(
        self,
        user_id: int,
        period: SubscriptionPeriodEnum,
        expires_at: Optional[int] = None,
    ) -> bool:
        """
        更新用户订阅

        Args:
            user_id: 用户 ID
            period: 订阅周期
            expires_at: 过期时间（毫秒时间戳），None 表示永久
        """
        try:
            existing = await self.get_by_id(user_id)

            if existing:
                return await self.update(
                    user_id,
                    period=period,
                    expires_at=expires_at,
                    updated_at=timestamp_now(),
                )
            else:
                subscription = UserSubscriptionModel(
                    user_id=user_id,
                    period=period,
                    expires_at=expires_at,
                )
                await self.create(subscription)
                return True
        except Exception as e:
            logger.error(f"Update user subscription failed: {e}")
            raise

    async def get_user_subscription_config(
        self, user_id: int
    ) -> tuple[UserSubscriptionModel, SubscriptionConfig]:
        """
        获取用户订阅配置

        Returns:
            (订阅周期, 配置字典)
        """
        if user_id is None or user_id == 0:
            subscription = UserSubscriptionModel(
                user_id=0,
                period=SubscriptionPeriodEnum.FREE,
                expires_at=None,
            )
            config = get_subscription_config(SubscriptionPeriodEnum.FREE)
            return subscription, config
        else:
            subscription = await self.get_user_subscription(user_id)
            config = get_subscription_config(subscription.period)
            return subscription, config

    async def pay_callback(self, order: OrderModel) -> bool:
        """处理订阅支付成功回调

        Args:
            order: 订单对象

        Returns:
            bool: 是否处理成功
        """

        try:
            # product_id 就是订阅周期 (month, quarter, lifetime)
            period = order.product_id

            # 调用订阅服务激活订阅
            # free 和 lifetime 不需要过期时间
            if period in ("free", "lifetime"):
                expires_at = None
            else:
                # month 和 quarter 需要计算过期时间
                now = timestamp_now_datetime()
                if period == "month":
                    expire_dt = now + timedelta(days=30)
                else:  # quarter
                    expire_dt = now + timedelta(days=90)
                expires_at = int(expire_dt.timestamp() * 1000)

            # 激活订阅
            await subscription_service.update_user_subscription(
                user_id=order.user_id,
                period=period,  # type: ignore
                expires_at=expires_at,
            )

            logger.info(
                f"Subscription activated for user {order.user_id}, "
                f"period: {period}, order: {order.order_no}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to activate subscription: {e}")
            return False


# 全局实例
subscription_service = SubscriptionService()
