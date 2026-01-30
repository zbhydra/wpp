"""订阅管理 API - 客户端接口"""

from app.api.user_dependencies import UserContext, get_current_user_optional
from app.schemas.subscription_schema import SubscriptionStatusResponse
from app.services.quota_service import quota_service
from app.services.subscription_service import subscription_service
from app.utils.response import ResponseUtils
from app.utils.time import get_today_date
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/subscription", tags=["订阅管理"])


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: UserContext = Depends(get_current_user_optional),
):
    """获取当前用户订阅状态

    支持已登录和未登录用户：
    - 已登录：使用 user_id 获取订阅配置和配额
    - 未登录：返回游客免费订阅（user_id=0），配额基于 device_id 统计
    - 既没有 token 也没有 device_id：返回 401 错误
    """

    # user_id: 已登录用户 > 0，游客 = 0
    user_id = current_user.user_id

    subscription, config = await subscription_service.get_user_subscription_config(
        user_id
    )

    expires_at = None

    if subscription:
        expires_at = subscription.expires_at

    daily_limit = config.daily_download_limit

    # 无限制用户
    if daily_limit == -1:
        used = 0
        remaining = -1
        reset_date = ""
    else:
        # 基于 UserContext 获取已使用次数（支持已登录和未登录用户）
        used = await quota_service.get_daily_used_with_context(current_user)

        remaining = max(0, daily_limit - used)
        reset_date = get_today_date()

    return ResponseUtils.ok(
        {
            "period": subscription.period,
            "display_name": config.display_name,
            "expires_at": expires_at,
            "daily_limit": daily_limit,
            "used": used,
            "remaining": remaining,
            "reset_date": reset_date,
        }
    )
