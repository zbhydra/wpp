"""
客户端 API 端点模块
"""

from .auth_client import router as auth_router
from .counter_client import router as counter_router

__all__ = [
    "auth_router",
    "counter_router",
]
