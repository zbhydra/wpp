from app.utils.logger import logger
from app.schemas.callback_schema import TestPayCallBack
from fastapi import APIRouter, Request

router = APIRouter(prefix="/callback", tags=["回调管理"])


@router.post("/test-the-test-bank-callback")
async def test_pay_callback(data: TestPayCallBack, request: Request):
    """
    测试支付回调

    """
    logger.info(f"Test pay callback: {data}")

    pass
