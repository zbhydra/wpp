"""业务回调服务"""

import json
from typing import Optional

from app.constants.order import CallbackStatus

# TODO: PaymentMethod 和 get_callback_handler 需要重新实现
# from app.constants.order import PaymentMethod, get_callback_handler
from app.core.singleton import singleton
from app.models.callback_log_model import CallbackLogModel
from app.models.order_model import OrderModel
from app.services.base_service import BaseService
from app.services.order_service import order_service
from app.utils.logger import logger


@singleton
class CallbackService(BaseService[CallbackLogModel]):
    """业务回调服务"""

    primary_key_field = "id"

    def __init__(self):
        super().__init__(CallbackLogModel)
        self._max_retries = 3

    async def trigger_business_callback(self, order: OrderModel) -> bool:
        """触发业务回调

        Args:
            order: 订单对象

        Returns:
            bool: 回调是否成功
        """
        order_no = order.order_no

        # 检查订单状态
        if order.order_status != "paid":
            logger.warning(f"Order {order_no} is not paid, skipping callback")
            return False

        # TODO: 重新实现回调处理器获取逻辑
        # 获取回调处理器
        # product_class = ProductClass(order.product_class)
        # handler = get_callback_handler(product_class)

        handler = None  # 暂时设为 None

        if not handler:
            logger.warning(
                f"No callback handler for product_class: {order.product_class}"
            )
            # 没有处理器，标记为成功（不需要回调）
            await order_service.update_callback_status(
                order_no, CallbackStatus.SUCCESS.value
            )
            return True

        # 执行回调
        try:
            # 准备回调数据
            callback_data = {
                "order_id": order.id,
                "order_no": order.order_no,
                "user_id": order.user_id,
                "product_class": order.product_class,
                "product_id": order.product_id,
                "cash": order.cash,
                "currency": order.currency,
                "paid_at": order.paid_at,
            }

            # 调用处理器
            success = await handler(order)

            if success:
                # 回调成功
                await order_service.update_callback_status(
                    order_no, CallbackStatus.SUCCESS.value
                )
                await self._log_callback(
                    order, callback_data, None, 200, CallbackStatus.SUCCESS.value
                )
                logger.info(f"Business callback success for order {order_no}")
                return True
            else:
                # 回调失败
                await order_service.update_callback_status(
                    order_no, CallbackStatus.FAILED.value
                )
                await self._log_callback(
                    order,
                    callback_data,
                    None,
                    None,
                    CallbackStatus.FAILED.value,
                    "Handler returned False",
                )
                logger.warning(f"Business callback failed for order {order_no}")
                return False

        except Exception as e:
            # 回调异常
            await order_service.update_callback_status(
                order_no, CallbackStatus.FAILED.value
            )
            await self._log_callback(
                order,
                callback_data,
                None,
                None,
                CallbackStatus.FAILED.value,
                str(e),
            )
            logger.error(f"Business callback error for order {order_no}: {e}")
            return False

    async def _log_callback(
        self,
        order: OrderModel,
        request_body: dict,
        response_body: Optional[str],
        http_status: Optional[int],
        callback_status: int,
        error_message: Optional[str] = None,
    ) -> None:
        """记录回调日志

        Args:
            order: 订单对象
            request_body: 请求体
            response_body: 响应体
            http_status: HTTP状态码
            callback_status: 回调状态
            error_message: 错误信息
        """
        log = CallbackLogModel(  # type: ignore[call-arg]
            order_id=order.id,
            order_no=order.order_no,
            callback_url=f"handler:{order.product_class}",
            request_body=json.dumps(request_body, ensure_ascii=False),
            response_body=response_body,
            http_status=http_status,
            callback_status=str(callback_status),
            error_message=error_message,
        )
        await self.create(log)

    # async def test_pay_callback(self, method: PaymentMethod, data: Any) -> bool:
    #     """测试支付回调
    #
    #     Args:
    #         data: 测试支付回调数据
    #
    #     Returns:
    #         bool: 测试支付回调是否成功
    #     """
    #
    #     return True


# 全局实例
callback_service = CallbackService()
