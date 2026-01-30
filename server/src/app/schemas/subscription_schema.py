"""订阅相关数据模型"""

from pydantic import BaseModel, Field


class SubscriptionStatusResponse(BaseModel):
    """订阅状态响应"""

    period: str = Field(..., description="订阅周期")
    display_name: str = Field(..., description="订阅显示名称")
    expires_at: int | None = Field(None, description="过期时间（毫秒时间戳）")
    daily_limit: int = Field(..., description="每日下载限制（-1 表示无限制）")
    used: int = Field(..., description="今日已用次数")
    remaining: int = Field(..., description="剩余配额（-1 表示无限制）")
    reset_date: str = Field(..., description="重置日期（YYYY-MM-DD）")
