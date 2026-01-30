"""
pytest 配置文件
"""

import asyncio
import sys
import warnings
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.core.database import get_async_session

# 添加 src 目录到 Python 路径
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))


# 抑制 aiomysql 连接关闭时的警告，这是已知的 pytest+aiomysql 兼容性问题
def pytest_configure(config):
    """配置 pytest，抑制特定警告"""
    import os

    # 设置测试环境标记
    os.environ["PYTEST_RUNNING"] = "true"
    os.environ["TESTING"] = "true"

    # 使用多种方式抑制警告
    warnings.filterwarnings(
        "ignore",
        category=pytest.PytestUnraisableExceptionWarning,
        message=".*Event loop is closed.*",
    )
    warnings.filterwarnings("ignore", category=pytest.PytestUnraisableExceptionWarning)
    # 设置环境变量也抑制警告
    os.environ["PYTHONWARNINGS"] = "ignore::pytest.PytestUnraisableExceptionWarning"


# 在会话开始时设置警告过滤器
@pytest.fixture(scope="session", autouse=True)
def setup_warnings():
    """设置警告过滤器"""
    warnings.filterwarnings(
        "ignore",
        category=pytest.PytestUnraisableExceptionWarning,
        message=".*Event loop is closed.*",
    )
    warnings.filterwarnings("ignore", category=pytest.PytestUnraisableExceptionWarning)
    yield


@pytest.fixture(scope="function")
def event_loop():
    """创建一个事件循环实例（每个测试函数一个新循环）"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    # 关闭事件循环
    loop.close()


@pytest.fixture(scope="function")
async def setup_test_database():
    """设置测试数据库 - 每个测试函数都重新设置"""
    from app.core.database import Base, get_engine

    # 导入所有 models 以确保 SQLAlchemy 能发现所有模型
    import app.models  # noqa: F401

    print("\nSetting up test database...")

    try:
        engine = get_engine()

        # 创建所有表
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            print("Database tables created successfully")

        # 验证表是否创建成功
        async with engine.begin() as conn:
            result = await conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            print(f"Tables in database: {tables}")

            if "whatsapp_accounts" in tables:
                print("✓ WhatsApp accounts table is ready")

        yield  # 让测试运行

    except Exception as e:
        print(f"Failed to setup test database: {e}")
        # 不抛出异常，让测试能够继续
        yield


@pytest.fixture
async def async_client():
    """提供异步测试客户端"""
    from app.core.database import reset_engine_for_test
    from app.main import app

    # 重置引擎以确保干净的状态
    reset_engine_for_test()

    # 使用 ASGI 传输来测试 FastAPI 应用
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as ac:
        yield ac


@pytest.fixture
async def db_session():
    """提供一个数据库会话用于测试（别名）"""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.database import get_engine

    engine = get_engine()
    async with AsyncSession(engine) as session:
        # 清理所有表的数据（注意外键依赖顺序）
        await session.execute(text("DELETE FROM admin_operation_logs"))
        await session.execute(text("DELETE FROM admin_user_permissions"))
        await session.execute(text("DELETE FROM admin_user_sessions"))
        await session.execute(text("DELETE FROM admin_users"))
        await session.execute(text("DELETE FROM admin_permissions"))
        await session.execute(text("DELETE FROM places"))
        await session.execute(text("DELETE FROM user_sessions"))
        await session.execute(text("DELETE FROM user_enterprises"))
        await session.execute(text("DELETE FROM enterprises"))
        await session.execute(text("DELETE FROM users"))
        await session.commit()
        try:
            yield session
        finally:
            # 确保会话正确关闭
            await session.close()


@pytest.fixture
async def test_db_session():
    """提供一个数据库会话用于测试"""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.database import Base, get_engine

    # 确保所有表都存在
    import app.models  # noqa: F401

    engine = get_engine()

    # 创建表（如果不存在）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        # 定义要清理的表列表（按外键依赖顺序）
        tables_to_cleanup = [
            "user_sessions",
            "user_enterprises",
            "enterprises",
            "users",
        ]

        # 清理所有表的数据，忽略不存在的表
        for table in tables_to_cleanup:
            try:
                await session.execute(text(f"DELETE FROM {table}"))
            except Exception:
                pass  # 表不存在，忽略

        await session.commit()
        try:
            yield session
        finally:
            # 确保会话正确关闭
            await session.close()


@pytest.fixture(scope="function", autouse=True)
async def cleanup_db_connections():
    """每个测试函数后自动清理数据库连接和测试数据"""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.core.database import (
        close_engine,
        get_engine,
        reset_engine_for_test,
    )

    # 测试开始前重置引擎
    reset_engine_for_test()

    yield  # 让测试运行

    try:
        # 清理数据库中的所有测试数据
        engine = get_engine()
        async with AsyncSession(engine) as session:
            try:
                # 定义要清理的表列表（按外键依赖顺序）
                tables_to_cleanup = [
                    "user_sessions",
                    "user_enterprises",
                    "enterprises",
                    "users",
                ]

                # 清理所有表的数据，忽略不存在的表
                for table in tables_to_cleanup:
                    try:
                        await session.execute(text(f"DELETE FROM {table}"))
                    except Exception:
                        pass  # 表不存在，忽略

                await session.commit()
            except Exception:
                await session.rollback()
            finally:
                await session.close()

        # 确保引擎连接关闭
        await close_engine()
    except Exception:
        pass  # 忽略清理过程中的错误


# Shared fixtures for integration tests
@pytest.fixture
async def test_db():
    """测试数据库连接"""
    async with get_async_session() as db:
        yield db
