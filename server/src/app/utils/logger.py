import logging
import os

from app.core.config import settings


def setup_logger(
    name: str,
    level: str | None = None,
    log_format: str | None = None,
    log_file: str | None = None,
) -> logging.Logger:
    """设置日志记录器"""

    logger = logging.getLogger(name)

    # 如果已经设置过处理器，直接返回
    if logger.handlers:
        return logger

    # 设置日志级别
    log_level = level or settings.logging.level
    logger.setLevel(getattr(logging, log_level.upper()))

    # 设置日志格式
    formatter = logging.Formatter(log_format or settings.logging.format)

    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 创建文件处理器
    file_path = log_file or settings.logging.file
    if file_path:
        # 确保日志目录存在
        log_dir = os.path.dirname(file_path)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)

        file_handler = logging.FileHandler(file_path, encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


# 创建默认日志记录器
logger = setup_logger("server")
