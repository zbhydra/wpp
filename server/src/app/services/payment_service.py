"""支付服务"""

from app.constants.order import OrderCreateParam


from app.core.singleton import singleton


@singleton
class PaymentService:
    """支付服务"""

    def __init__(self):
        pass

    async def step_create_order(self, param: OrderCreateParam):
        """创建订单"""
        # 这里要干几件事

        ## 创建订单
        # order = await order_service.create_order(param)

        ## 选择支付渠道

        pass

    # async def create_payment(
    #     self,
    #     order_no: str,
    #     product_name: str,
    #     amount_cents: int,
    #     payment_method: str,
    #     callback_url: str,
    #     client_ip: Optional[str] = None,
    # ) -> PaymentResponse:
    #     """创建支付

    #     Args:
    #         order_no: 订单号
    #         product_name: 商品名称
    #         amount_cents: 金额（美分）
    #         payment_method: 支付方式
    #         callback_url: 回调URL
    #         client_ip: 客户端IP

    #     Returns:
    #         PaymentResponse: 支付响应
    #     """
    #     try:
    #         # 获取支付网关
    #         gateway = payment_provider.create(PaymentMethod[payment_method.upper()])

    #         # 创建支付请求
    #         request = PaymentRequest(
    #             order_no=order_no,
    #             amount_cents=amount_cents,
    #             currency="USD",
    #             product_name=product_name,
    #             callback_url=callback_url,
    #             client_ip=client_ip,
    #         )

    #         # 调用支付网关创建支付
    #         response = await gateway.create_payment(request)

    #         return response

    #     except ValueError:
    #         logger.error(f"Unsupported payment method: {payment_method}")
    #         return PaymentResponse(
    #             success=False, error_message=f"不支持的支付方式: {payment_method}"
    #         )
    #     except Exception as e:
    #         logger.error(f"Failed to create payment: {e}")
    #         return PaymentResponse(success=False, error_message=str(e))

    # async def handle_payment_callback(
    #     self, payment_method: str, request: Request
    # ) -> CallbackVerificationResult:
    #     """处理支付回调

    #     Args:
    #         payment_method: 支付方式
    #         request: FastAPI Request

    #     Returns:
    #         CallbackVerificationResult: 验证结果
    #     """
    #     try:
    #         # 获取支付网关
    #         gateway = payment_provider.create(PaymentMethod[payment_method.upper()])

    #         # 验证回调签名
    #         result = await gateway.verify_callback(request)

    #         if not result.valid:
    #             logger.warning(
    #                 f"Payment callback verification failed: {result.error_message}"
    #             )
    #             return result

    #         # 更新订单状态
    #         if result.order_no:
    #             await order_service.update_order_by_no(
    #                 order_no=result.order_no,
    #                 new_status=OrderStatus.PAID.value,
    #                 channel_order_no=result.channel_order_no,
    #                 paid_at=timestamp_now(),
    #             )

    #         return result

    #     except Exception as e:
    #         logger.error(f"Failed to handle payment callback: {e}")
    #         return CallbackVerificationResult(valid=False, error_message=str(e))


# 全局实例
payment_service = PaymentService()
