"""订单核心服务"""

import time
from typing import Optional

from sqlalchemy import select

from app.constants.order import (
    ORDER_STATE_TRANSITIONS,
    OrderCreateParam,
    OrderStatus,
)
from app.core.database import get_async_session
from app.core.singleton import singleton
from app.models.order_model import OrderModel
from app.services.base_service import BaseService
from app.utils.logger import logger
from app.utils.time import timestamp_now


@singleton
class OrderService(BaseService[OrderModel]):
    """订单核心服务"""

    primary_key_field = "id"

    def __init__(self):
        super().__init__(OrderModel)
        self._order_expire_minutes = 30  # 订单过期时间（分钟）

    def can_transition_order_status(
        self, from_status: OrderStatus, to_status: OrderStatus
    ) -> bool:
        """检查订单状态转换是否合法"""
        return to_status in ORDER_STATE_TRANSITIONS.get(from_status, [])

    async def create_order(self, param: OrderCreateParam) -> OrderModel:
        """创建订单

        Args:
            param: 订单创建参数

        Returns:
            OrderModel: 创建的订单对象
        """
        # 生成订单号（时间戳 + 随机数）
        order_no = self._generate_order_no()

        # 计算过期时间
        expired_at = timestamp_now() + (self._order_expire_minutes * 60 * 1000)

        # 创建订单
        order = OrderModel(  # type: ignore[call-arg]
            order_no=order_no,
            user_id=param.user_id,
            product_class=param.product_class,
            product_id=param.product_id,
            product_name=param.product_name,
            cash=param.cash,
            currency=param.currency,
            expired_at=expired_at,
            client_ip=param.client_ip,
        )
        return await self.create(order)

    async def get_order_by_no(self, order_no: str) -> Optional[OrderModel]:
        """根据订单号查询订单

        Args:
            order_no: 订单号

        Returns:
            OrderModel | None: 订单对象或None
        """
        async with get_async_session() as db:
            stmt = select(OrderModel).where(OrderModel.order_no == order_no)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()

    async def get_user_orders(
        self,
        user_id: int,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[OrderModel]:
        """获取用户订单列表

        Args:
            user_id: 用户ID
            status: 订单状态（可选）
            offset: 偏移量
            limit: 限制数量

        Returns:
            list[OrderModel]: 订单列表
        """
        async with get_async_session() as db:
            stmt = select(OrderModel).where(OrderModel.user_id == user_id)

            if status:
                stmt = stmt.where(OrderModel.order_status == status)

            stmt = (
                stmt.order_by(OrderModel.created_at.desc()).offset(offset).limit(limit)
            )
            result = await db.execute(stmt)
            return list(result.scalars().all())

    async def update_order_status(
        self,
        order_id: int,
        new_status: str,
        paid_at: Optional[int] = None,
    ) -> bool:
        """更新订单状态（带状态机验证）

        Args:
            order_id: 订单ID
            new_status: 新状态
            paid_at: 支付时间（可选）

        Returns:
            bool: 是否更新成功
        """
        order = await self.get_by_id(order_id)
        if not order:
            logger.warning(f"Order not found: {order_id}")
            return False

        # 验证状态转换
        from_status = OrderStatus(order.order_status)
        to_status = OrderStatus(new_status)

        if not self.can_transition_order_status(from_status, to_status):
            logger.warning(
                f"Invalid status transition: {from_status.value} -> {to_status.value}"
            )
            return False

        # 更新状态
        update_data: dict = {
            "order_status": new_status,
            "updated_at": timestamp_now(),
        }

        if paid_at is not None:
            update_data["paid_at"] = paid_at

        return await self.update(order_id, **update_data)

    async def update_order_by_no(
        self,
        order_no: str,
        new_status: str,
        channel_order_no: Optional[str] = None,
        paid_at: Optional[int] = None,
    ) -> bool:
        """根据订单号更新订单状态

        Args:
            order_no: 订单号
            new_status: 新状态
            channel_order_no: 支付渠道订单号
            paid_at: 支付时间

        Returns:
            bool: 是否更新成功
        """
        # 先获取订单用于验证状态（session 会在此后关闭）
        order = await self.get_order_by_no(order_no)
        if not order:
            logger.warning(f"Order not found: {order_no}")
            return False

        # 验证状态转换
        from_status = OrderStatus(order.order_status)
        to_status = OrderStatus(new_status)

        if not self.can_transition_order_status(from_status, to_status):
            logger.warning(
                f"Invalid status transition: {from_status.value} -> {to_status.value}"
            )
            return False

        # 更新状态（在新 session 中重新查询并更新）
        update_data: dict = {
            "order_status": new_status,
            "updated_at": timestamp_now(),
        }

        if channel_order_no:
            update_data["payment_channel_order_no"] = channel_order_no

        if paid_at is not None:
            update_data["paid_at"] = paid_at

        async with get_async_session() as db:
            try:
                # 在新 session 中重新查询订单
                stmt = select(OrderModel).where(OrderModel.order_no == order_no)
                result = await db.execute(stmt)
                order = result.scalar_one_or_none()

                if not order:
                    logger.warning(f"Order not found in new session: {order_no}")
                    return False

                # 更新字段
                for key, value in update_data.items():
                    setattr(order, key, value)
                await db.commit()
                logger.info(f"Order {order_no} status updated to {new_status}")
                return True
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to update order {order_no}: {e}")
                return False

    async def update_callback_status(self, order_no: str, callback_status: int) -> bool:
        async with get_async_session() as db:
            stmt = select(OrderModel).where(OrderModel.order_no == order_no)
            result = await db.execute(stmt)
            order = result.scalar_one_or_none()
            
            if not order:
                return False
            
            order.callback_status = callback_status
            order.updated_at = timestamp_now()
            await db.commit()
            return True

    def _generate_order_no(self) -> str:
        """生成订单号

        格式: ORD + 时间戳(毫秒) + 4位随机数
        """
        import random

        timestamp = int(time.time() * 1000)
        random_part = random.randint(0, 9999)
        return f"ORD{timestamp}{random_part:04d}"


# 全局实例
order_service = OrderService()
