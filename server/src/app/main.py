"""
FastAPI 请求处理流程

================================================================================
请求进入 (Request In)
================================================================================

1. Middleware 按添加顺序的**反向**执行（洋葱模型）
   ┌────────────────────────────────────────────────────────────────────┐
   │  RequestLoggingMiddleware (最后添加，最先执行)                     │
   │  ├─ 记录请求开始                                                    │
   │  └─ await call_next(request) ──────────────────────────┐           │
   │                                                          │           │
   │  CrossOriginMiddleware (中间添加)                        │           │
   │  ├─ 处理 CORS                                            │           │
   │  └─ await call_next(request) ───────────────────┐       │           │
   │                                                    │       │           │
   │  ErrorHandlingMiddleware (最先添加，最后执行)     │       │           │
   │  ├─ try: await call_next(request) ────────┐       │       │           │
   │  │                                        │       │       │           │
   │  │  ↓ 路由处理 & 业务逻辑                  │       │       │           │
   └──┼────────────────────────────────────────┼───────┼───────┼───────────┘
      │                                        │       │       │
      │  ┌─────────────────────────────────────┼───────┼───────┼───────────┐
      │  │  Pydantic 验证请求参数               │       │       │           │
      │  │  ├─ 解析请求体                       │       │       │           │
      │  │  └─ 失败 → raise ValidationError     │       │       │           │
      │  │                                        │       │       │           │
      │  │  路由处理函数                         │       │       │           │
      │  │  ├─ 执行业务逻辑                     │       │       │           │
      │  │  └─ return Response                  │       │       │           │
      │  └─────────────────────────────────────┼───────┼───────┼───────────┘
      │                                        │       │       │
      │  ↓ 异常处理流程                        │       │       │
      │                                        │       │       │
      │  @app.exception_handler(ValidationError) ←─────┘       │
      │  ├─ 捕获 ValidationError                        │       │
      │  ├─ 自定义错误响应                              │       │
      │  └─ return JSONResponse (status=422) ──────────┐       │
      │                                                │       │
      │  其他未捕获异常 → 传播回 Middleware ────────────┘       │
      │                                                        │
      │  ↓ 响应返回 (Response Out)                              │
      │                                                        │
      └─ ErrorHandlingMiddleware except 块捕获异常 ────────────┘
         ├─ 捕获 AppCommonException → 翻译后返回
         └─ 捕获其他 Exception → 通用错误响应

================================================================================
异常处理优先级
================================================================================

1. @app.exception_handler() 先触发
   - 处理路由处理阶段抛出的特定异常（如 ValidationError）
   - 返回自定义错误响应

2. Middleware 的 except 块后触发
   - 只捕获 Exception Handler 未处理的异常
   - ErrorHandlingMiddleware 处理 AppCommonException 和通用异常

================================================================================
Middleware 添加顺序与执行顺序
================================================================================

添加顺序:
  app.add_middleware(ErrorHandlingMiddleware)      # ① 最先添加
  app.add_middleware(CrossOriginMiddleware)        # ②
  app.add_middleware(RequestLoggingMiddleware)     # ③ 最后添加

请求进入顺序 (从外到内):
  ③ RequestLoggingMiddleware → ② CrossOrigin → ① ErrorHandling → 路由

响应返回顺序 (从内到外):
  路由 → ① ErrorHandling → ② CrossOrigin → ③ RequestLogging → 响应

================================================================================
"""

from contextlib import asynccontextmanager

from app.middleware.cross_origin import CrossOriginMiddleware
import uvicorn

from app.api.system.health import router as health_router
from app.api.client.auth_client import router as auth_router
from app.api.client.counter_client import router as counter_router
from app.api.client.quota_client import router as quota_router
from app.api.client.subscription_client import router as subscription_router
from app.api.client.order_client import router as order_router
from app.api.callback.test_pay_callback import router as callback_router
from app.core.config import settings
from app.core.database import close_engine, init_db
from app.utils.logger import logger, setup_logger
from app.middleware import (
    ErrorHandlingMiddleware,
    RequestLoggingMiddleware,
)
from fastapi import FastAPI



# 设置日志
setup_logger("server")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动事件
    logger.info(f"Starting {settings.app.name} v{settings.app.version}")

    await init_db()

    logger.info("Application started successfully")

    yield

    # 关闭事件
    logger.info("Application is shutting down")

    await close_engine()


# 创建 FastAPI 应用
# 生产环境关闭 API 文档
is_prod = settings.app.env == "prod"
app = FastAPI(
    title=settings.api.title,
    description=settings.api.description,
    lifespan=lifespan,
)

# 添加中间件
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(CrossOriginMiddleware)
app.add_middleware(RequestLoggingMiddleware)



# 包含路由 - API 路由
app.include_router(health_router, prefix="/api/system", tags=["system"])
app.include_router(auth_router, prefix="/api/client", tags=["client"])
app.include_router(counter_router, prefix="/api/client", tags=["client"])
app.include_router(quota_router, prefix="/api/client", tags=["client"])
app.include_router(subscription_router, prefix="/api/client", tags=["client"])
app.include_router(order_router, prefix="/api/client", tags=["client"])
app.include_router(callback_router, prefix="/api/callback", tags=["callback"])


@app.get("/api")
async def api_info():
    """API根路径"""
    return {
        "message": f"Welcome to {settings.app.name}",
        "version": settings.app.version,
        # "docs": settings.api.docs_url,
    }


def main_entry():
    """命令行入口点"""
    import multiprocessing

    # 生产环境使用多 worker
    if settings.app.env == "prod":
        workers = multiprocessing.cpu_count()
        uvicorn.run(
            "app.main:app",
            host=settings.app.host,
            port=settings.app.port,
            workers=workers,
            log_level=settings.logging.level.lower(),
            access_log=True,
        )
    else:
        uvicorn.run(
            "app.main:app",
            host=settings.app.host,
            port=settings.app.port,
            reload=settings.app.debug,
            log_level=settings.logging.level.lower(),
        )


if __name__ == "__main__":
    main_entry()
