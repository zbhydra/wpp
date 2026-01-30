"""类型存根 - UserSubscriptionModel"""

from typing import Optional

from app.constants.subscription import SubscriptionPeriodEnum
from app.models.base import BaseDBModel

class UserSubscriptionModel(BaseDBModel):
    """用户订阅表类型存根"""

    user_id: int
    period: SubscriptionPeriodEnum
    expires_at: Optional[int]
    created_at: int
    updated_at: int

    def __init__(
        self,
        user_id: int,
        period: SubscriptionPeriodEnum,
        expires_at: Optional[int] = None,
        created_at: Optional[int] = None,
        updated_at: Optional[int] = None,
    ) -> None: ...
