"""
计数器 API - 客户端接口
"""

from typing import Optional

from fastapi import APIRouter, Depends

from app.api.user_dependencies import (
    UserContext,
    get_current_user_optional,
)
from app.constants.counter import CounterType
from app.services.counter_service import counter_service
from app.utils.response import ResponseUtils

router = APIRouter(prefix="/counter", tags=["计数器"])


def _extract_user_or_device_id(
    current_user: Optional[UserContext],
) -> tuple[Optional[int], Optional[str]]:
    """
    提取 user_id（已登录）或 device_id（未登录）
    """
    if current_user:
        return current_user.user_id, current_user.device_id
    return None, None


@router.post("/increment")
async def increment_counter(
    counter_type: CounterType,
    delta: int = 1,
    current_user: Optional[UserContext] = Depends(get_current_user_optional),
):
    """
    增加计数器

    - 已登录用户使用 user_id
    - 未登录用户使用 device_id（从 UserContext 获取）
    """
    user_id, device_id = _extract_user_or_device_id(current_user)

    new_value = await counter_service.increment(
        counter_type=counter_type,
        user_id=user_id,
        device_id=device_id,
        delta=delta,
    )

    return ResponseUtils.ok({"counter_type": counter_type, "value": new_value})


@router.get("/get")
async def get_counter(
    counter_type: CounterType,
    current_user: Optional[UserContext] = Depends(get_current_user_optional),
):
    """获取当前计数值"""
    user_id, device_id = _extract_user_or_device_id(current_user)

    value = await counter_service.get(
        counter_type=counter_type,
        user_id=user_id,
        device_id=device_id,
    )

    return ResponseUtils.ok({"counter_type": counter_type, "value": value})


@router.get("/get-all")
async def get_all_counters(
    current_user: Optional[UserContext] = Depends(get_current_user_optional),
):
    """获取用户所有计数器的值"""
    user_id, device_id = _extract_user_or_device_id(current_user)

    values = await counter_service.get_all_counters(
        user_id=user_id,
        device_id=device_id,
    )

    return ResponseUtils.ok({"counters": {k.value: v for k, v in values.items()}})
