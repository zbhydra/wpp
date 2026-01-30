"""User 数据库操作类（Service）"""

from typing import Optional

from sqlalchemy import select

from app.core.database import get_async_session
from app.core.singleton import singleton
from app.services.base_service import BaseService
from app.models.user_model import UserModel
from app.utils.crypto import hash_password
from app.utils.time import timestamp_now


@singleton
class UserService(BaseService[UserModel]):
    """用户数据库操作类（单例模式）"""

    primary_key_field = "user_id"

    def __init__(self) -> None:
        super().__init__(UserModel)

    async def create_user(
        self,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> UserModel:
        """创建用户"""
        password_hash = hash_password(password)
        user = UserModel(  # type: ignore[call-arg]
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            avatar_url=avatar_url,
            is_del=False,
            created_at=timestamp_now(),
            updated_at=timestamp_now(),
        )
        return await self.create(user)

    async def create_user_without_password(
        self,
        email: str,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> UserModel:
        """创建无密码用户（用于邮箱验证码登录）"""
        user = UserModel(  # type: ignore[call-arg]
            email=email,
            password_hash="!NOLOGIN!",  # magic password
            full_name=full_name,
            avatar_url=avatar_url,
            is_del=False,
            created_at=timestamp_now(),
            updated_at=timestamp_now(),
        )
        return await self.create(user)

    async def get_user_by_email(self, email: str) -> Optional[UserModel]:
        """根据邮箱获取用户"""
        async with get_async_session() as db:
            stmt = select(UserModel).where(UserModel.email == email)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()

    async def update_login_info(self, user_id: int) -> bool:
        """更新用户登录信息"""
        async with get_async_session() as db:
            try:
                stmt = select(UserModel).where(UserModel.user_id == user_id)
                result = await db.execute(stmt)
                user = result.scalar_one_or_none()

                if user:
                    user.last_login_at = timestamp_now()
                    user.login_count += 1
                    user.updated_at = timestamp_now()
                    await db.commit()
                    return True
                return False
            except Exception:
                await db.rollback()
                raise

    async def increment_failed_attempts(self, user_id: int) -> bool:
        """增加用户失败登录次数"""
        # TODO::
        return True

        # async with get_async_session() as db:
        #     try:
        #         stmt = select(UserModel).where(UserModel.user_id == user_id)
        #         result = await db.execute(stmt)
        #         user = result.scalar_one_or_none()

        #         if user:
        #             user.updated_at = timestamp_now()
        #             await db.commit()
        #             return True
        #         return False
        #     except Exception:
        #         await db.rollback()
        #         raise

    async def lock_user_until(self, user_id: int, lock_until: int) -> bool:
        """锁定用户直到指定时间"""
        async with get_async_session() as db:
            try:
                stmt = select(UserModel).where(UserModel.user_id == user_id)
                result = await db.execute(stmt)
                user = result.scalar_one_or_none()

                if user:
                    user.locked_until = lock_until
                    user.updated_at = timestamp_now()
                    await db.commit()
                    return True
                return False
            except Exception:
                await db.rollback()
                raise

    async def unlock_user(self, user_id: int) -> bool:
        """解锁用户"""
        async with get_async_session() as db:
            try:
                stmt = select(UserModel).where(UserModel.user_id == user_id)
                result = await db.execute(stmt)
                user = result.scalar_one_or_none()

                if user:
                    user.locked_until = None
                    user.updated_at = timestamp_now()
                    await db.commit()
                    return True
                return False
            except Exception:
                await db.rollback()
                raise


user_service = UserService()
