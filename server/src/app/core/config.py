import os
from typing import Any

import yaml  # type: ignore
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """应用配置"""

    name: str = Field(default="Scraper Server")
    version: str = Field(default="0.1.0")
    env: str = Field(default="dev")
    debug: bool = Field(default=False)
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=9660)


class DatabaseSettings(BaseSettings):
    """数据库配置"""

    model_config = SettingsConfigDict(
        env_prefix="DB_",
        env_file=None,  # 不读取 .env 文件
        case_sensitive=False,
        extra="ignore",
    )

    host: str = Field(default="localhost")
    port: int = Field(default=3306)
    user: str = Field(default="root")
    password: str = Field(default="password")
    database: str = Field(default="scraper")
    pool_size: int = Field(default=10)
    max_overflow: int = Field(default=20)

    @property
    def url(self) -> str:
        return f"mysql+aiomysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

    @property
    def async_url(self) -> str:
        return f"mysql+aiomysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class LoggingSettings(BaseSettings):
    """日志配置"""

    level: str = Field(default="INFO")
    format: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file: str = Field(default="server.log")


class APISettings(BaseSettings):
    """API配置"""

    title: str = Field(default="Scraper API")
    description: str = Field(default="API for receiving data from clients")
    version: str = Field(default="0.1.0")
    docs_url: str = Field(default="/docs")
    redoc_url: str = Field(default="/redoc")


class AuthSettings(BaseSettings):
    """认证配置"""

    model_config = SettingsConfigDict(
        env_prefix="AUTH_",
        env_file=None,
        case_sensitive=False,
        extra="ignore",
    )

    jwt_secret_key: str = Field(default="your-secret-key-change-in-production")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire: int = Field(default=86400)
    refresh_token_expire: int = Field(default=604800)
    refresh_token_remember_days: int = Field(default=30)
    max_login_attempts: int = Field(default=5)
    lock_duration_minutes: int = Field(default=30)
    rate_limit_times: int = Field(default=10)
    rate_limit_period: int = Field(default=60)


class RedisSettings(BaseSettings):
    """Redis 配置"""

    model_config = SettingsConfigDict(
        env_prefix="REDIS_",
        env_file=None,
        case_sensitive=False,
        extra="ignore",
    )

    host: str = Field(default="localhost")
    port: int = Field(default=6379, ge=1, le=65535)
    db: int = Field(default=0, ge=0, le=15)
    password: str | None = Field(default=None)
    pool_size: int = Field(default=50, ge=1)
    pool_timeout: int = Field(default=5, ge=1)
    key_prefix: str = Field(default="tg-download")
    socket_timeout: int = Field(default=5, ge=1)
    socket_connect_timeout: int = Field(default=5, ge=1)
    retry_on_timeout: bool = Field(default=True)
    retry_attempts: int = Field(default=3, ge=1)

    @property
    def url(self) -> str:
        """构建 Redis URL"""
        if self.password:
            return f"redis://:{self.password}@{self.host}:{self.port}/{self.db}"
        return f"redis://{self.host}:{self.port}/{self.db}"


class SMTPSettings(BaseSettings):
    """SMTP 邮件服务配置 - 支持 QQ 邮箱等"""

    model_config = SettingsConfigDict(
        env_prefix="SMTP_",
        env_file=None,
        case_sensitive=False,
        extra="ignore",
    )

    host: str = Field(default="smtp.qq.com", description="SMTP 服务器地址")
    port: int = Field(default=587, ge=1, le=65535, description="SMTP 端口")
    username: str = Field(default="", description="SMTP 用户名（通常是邮箱地址）")
    password: str = Field(
        default="",
        description="SMTP 授权码（QQ邮箱需要使用授权码，不是登录密码）",
    )
    use_tls: bool = Field(default=True, description="是否使用 TLS")
    from_email: str = Field(default="noreply@example.com", description="发件人邮箱")
    from_name: str = Field(default="TG Download", description="发件人名称")
    timeout: int = Field(default=10, ge=1, description="连接超时时间（秒）")


class Settings:
    """全局配置管理器"""

    def __init__(self, config_path: str | None = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__),
            "../../../config.yaml",
        )
        self._config_data = self._load_config()

        self.app = AppSettings(**self._config_data.get("app", {}))
        self.database = DatabaseSettings(**self._config_data.get("database", {}))
        self.logging = LoggingSettings(**self._config_data.get("logging", {}))
        self.api = APISettings(**self._config_data.get("api", {}))
        self.auth = AuthSettings(**self._config_data.get("auth", {}))
        self.redis = RedisSettings(**self._config_data.get("redis", {}))
        self.smtp = SMTPSettings(**self._config_data.get("smtp", {}))

    def _load_config(self) -> dict[str, Any]:
        """加载配置文件"""
        with open(self.config_path, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def reload(self):
        """重新加载配置"""
        self._config_data = self._load_config()
        self.app = AppSettings(**self._config_data.get("app", {}))
        self.database = DatabaseSettings(**self._config_data.get("database", {}))
        self.logging = LoggingSettings(**self._config_data.get("logging", {}))
        self.api = APISettings(**self._config_data.get("api", {}))
        self.auth = AuthSettings(**self._config_data.get("auth", {}))
        self.redis = RedisSettings(**self._config_data.get("redis", {}))
        self.smtp = SMTPSettings(**self._config_data.get("smtp", {}))


# 全局配置实例
settings = Settings()
