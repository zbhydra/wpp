"""配额 API - 客户端接口"""

from typing import Optional

from fastapi import APIRouter, Depends

from app.api.user_dependencies import UserContext, get_current_user_optional
from app.schemas.quota_schema import CheckQuotaRequest, CheckQuotaResponse
from app.services.quota_service import quota_service
from app.utils.response import ResponseUtils

router = APIRouter(prefix="/quota", tags=["配额管理"])


@router.post("/check", response_model=CheckQuotaResponse)
async def check_download_quota(
    request: CheckQuotaRequest,
    current_user: Optional[UserContext] = Depends(get_current_user_optional),
):
    """
    检查下载配额

    - 已登录用户：根据订阅层级检查
    - 匿名用户：使用免费版配额（5次/天）

    返回：
    - status=1: 配额充足，已消耗
    - status=0: 配额不足，未消耗
    """
    count = request.count
    if count < 1 or count is None:
        count = 1

    allowed, used, remaining = await quota_service.check_and_consume_quota(
        user_context=current_user,
        count=count,
    )

    # 配额不足时返回成功响应，但 status=0
    if not allowed:
        return ResponseUtils.ok(
            {
                "allowed": False,
                "count": 0,
                "used": used,
                "remaining": 0,
                "status": 0,
            }
        )

    return ResponseUtils.ok(
        {
            "allowed": True,
            "count": count,
            "used": used,
            "remaining": remaining,
            "status": 1,
        }
    )
