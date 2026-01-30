import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.utils.logger import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 生成请求ID
        request_id = str(uuid.uuid4())

        # 记录请求开始时间
        start_time = time.time()

        # 记录请求信息
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"- Request ID: {request_id} "
            f"- Client: {request.client.host if request.client else 'unknown'}"
        )

        # 将请求ID添加到请求状态中
        request.state.request_id = request_id

        # 处理请求
        response = await call_next(request)

        # 计算处理时间
        process_time = time.time() - start_time

        # 记录响应信息
        logger.info(
            f"Request completed: {request.method} {request.url.path} "
            f"- Request ID: {request_id} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.4f}s"
        )

        # 添加响应头
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)

        return response
