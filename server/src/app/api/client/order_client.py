"""订单管理 API - 客户端接口"""

from fastapi import APIRouter, Depends, Request

from app.api.user_dependencies import UserContext, get_current_user
from app.i18n.common_code import CommonCode
from app.schemas.order_schema import (
    CreateOrderRequest,
)
from app.services.order_service import order_service
from app.utils.response import ResponseUtils

router = APIRouter(prefix="/order", tags=["订单管理"])


@router.post("/create")
async def create_order(
    data: CreateOrderRequest,
    current_user: UserContext = Depends(get_current_user),
):
    """创建订单

    请求体:
    - product_class: 商品类别（枚举值，1=订阅，2=充值...）
    - product_id: 商品ID（业务系统定义，如 "month", "quarter"）
    - product_name: 商品名称
    - cash: 订单金额分

    响应:
    - order_no: 订单号
    - payment_url: 支付跳转URL
    - amount_cents: 金额（美分）
    - currency: 货币类型
    - expired_at: 过期时间（毫秒时间戳）
    """

    # 创建订单
    # param = OrderCreateParam(
    #     user_id=current_user.user_id,
    #     product_class=data.product_class,
    #     product_id=data.product_id,
    #     product_name=data.product_name,
    #     cash=data.cash,
    #     currency="USD",
    #     client_ip=current_user.device_id,
    # )

    # order = await payment_service.step_create_order(param)

    # # 创建支付
    # # 构造回调URL
    # import os

    # base_url = os.getenv("BASE_URL", "http://localhost:8000")
    # callback_url = f"{base_url}/api/client/order/callback/{request.payment_method}"

    # payment_response = await payment_service.create_payment(
    #     order_no=order.order_no,
    #     product_name=product_name,
    #     amount_cents=amount_cents,
    #     payment_method=request.payment_method,
    #     callback_url=callback_url,
    # )

    # if not payment_response.success:
    #     return ResponseUtils.error(CommonCode.PAYMENT_GATEWAY_ERROR)

    # 触发业务回调（异步）
    # 这里不等待回调完成，直接返回
    pass
    # return ResponseUtils.ok(
    #     {
    #         "order_no": order.order_no,
    #         "payment_url": payment_response.payment_url,
    #         "amount_cents": order.amount_cents,
    #         "currency": order.currency,
    #         "expired_at": order.expired_at,
    #     }
    # )


@router.get("/status/{order_no}")
async def get_order_status(
    order_no: str,
    current_user: UserContext = Depends(get_current_user),
):
    """查询订单状态（客户端轮询接口）

    响应:
    - order_no: 订单号
    - product_name: 商品名称
    - amount_cents: 金额
    - currency: 货币
    - order_status: 订单状态
    - callback_status: 回调状态
    - payment_method: 支付方式
    - paid_at: 支付时间
    - created_at: 创建时间
    """
    order = await order_service.get_order_by_no(order_no)

    if not order:
        return ResponseUtils.error(CommonCode.ORDER_NOT_FOUND)

    # 权限检查：只能查询自己的订单
    if order.user_id != current_user.user_id:
        return ResponseUtils.error(CommonCode.ORDER_NOT_FOUND)

    return ResponseUtils.ok(
        {
            "order_no": order.order_no,
            "product_name": order.product_name,
            "currency": order.currency,
            "order_status": order.order_status,
            "callback_status": order.callback_status,
            "payment_method": order.payment_method,
            "paid_at": order.paid_at,
            "created_at": order.created_at,
        }
    )


@router.get("/list")
async def list_orders(
    status: str = None,
    offset: int = 0,
    limit: int = 20,
    current_user: UserContext = Depends(get_current_user),
):
    """获取订单列表

    参数:
    - status: 订单状态（可选）
    - offset: 偏移量
    - limit: 限制数量
    """
    orders = await order_service.get_user_orders(
        user_id=current_user.user_id,
        status=status,
        offset=offset,
        limit=limit,
    )

    order_list = [
        {
            "order_no": o.order_no,
            "product_name": o.product_name,
            "currency": o.currency,
            "order_status": o.order_status,
            "callback_status": o.callback_status,
            "payment_method": o.payment_method,
            "paid_at": o.paid_at,
            "created_at": o.created_at,
        }
        for o in orders
    ]

    return ResponseUtils.ok(
        {
            "orders": order_list,
            "total": len(order_list),
            "offset": offset,
            "limit": limit,
        }
    )


@router.post("/callback/{payment_method}")
async def payment_callback(
    payment_method: str,
    request: Request,
):
    """支付回调接口（支付网关调用）

    - 验证签名
    - 更新订单状态
    - 触发业务回调

    注意：此接口无需JWT认证，由支付网关调用
    """
    # from app.constants.order import OrderStatus

    # result = await payment_service.handle_payment_callback(payment_method, request)

    # if not result.valid:
    #     return ResponseUtils.error(CommonCode.PAYMENT_VERIFICATION_FAILED)

    # # 触发业务回调（幂等性保证：只处理 pending 状态的订单）
    # if result.order_no:
    #     order = await order_service.get_order_by_no(result.order_no)
    #     if order and order.order_status == OrderStatus.PENDING:
    #         await callback_service.trigger_business_callback(order)

    # return ResponseUtils.ok({"message": "Callback processed"})
    pass
