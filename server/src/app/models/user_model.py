"""
User 数据模型
"""

from typing import Optional

from app.constants.auth import UserLoginStatus
from app.schemas.client_user_schema import UserInfo
from sqlalchemy import BigInteger, Boolean, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseDBModel
from app.utils.time import timestamp_now


class UserModel(BaseDBModel):
    """业务用户表"""

    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    email: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=True, comment="邮箱（登录用）"
    )
    password_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, comment="密码哈希 (bcrypt)"
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="全名"
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="头像URL"
    )
    is_del: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, comment="是否注销"
    )
    last_login_at: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, comment="最后登录时间(毫秒时间戳)"
    )
    login_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="登录次数"
    )
    locked_until: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, comment="锁定截止时间(毫秒时间戳)"
    )
    created_at: Mapped[int] = mapped_column(
        BigInteger,
        default=timestamp_now,
        nullable=False,
        comment="创建时间（毫秒时间戳）",
    )
    updated_at: Mapped[int] = mapped_column(
        BigInteger,
        default=timestamp_now,
        nullable=False,
        comment="更新时间（毫秒时间戳）",
    )

    # 索引
    __table_args__ = (Index("idx_email", "email"),)

    def __repr__(self) -> str:
        return f"<User(user_id={self.user_id}, email='{self.email}')>"

    def is_locked(self) -> bool:
        """检查用户是否被锁定"""
        if not self.locked_until:
            return False
        return self.locked_until > timestamp_now()

    def to_user_info(self) -> UserInfo:
        """转换为用户信息"""
        return UserInfo(
            user_id=self.user_id,
            email=self.email,
            full_name=self.full_name,
            avatar_url=self.avatar_url,
            created_at=self.created_at,
        )

    def user_status(self) -> UserLoginStatus:
        """检查用户状态"""
        if self.is_locked():
            return UserLoginStatus.LOCKED
        if self.is_del:
            return UserLoginStatus.DELETED
        return UserLoginStatus.OK
