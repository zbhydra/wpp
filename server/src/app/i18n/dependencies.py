"""
语言依赖注入

从 Accept-Language header 解析语言偏好，提供语言上下文。
"""

from dataclasses import dataclass
from typing import Final, Literal


# 支持的语言类型
SupportedLanguage = Literal["zh-CN", "en-US", "zh-TW", "ja-JP", "ko-KR"]

# 默认语言
DEFAULT_LANGUAGE: Final = "en-US"

# 支持的语言映射
LANGUAGE_MAPPING: Final = {
    "zh": "zh-CN",
    "zh-CN": "zh-CN",
    "zh-Hans": "zh-CN",
    "zh-TW": "zh-TW",
    "zh-Hant": "zh-TW",
    "en": "en-US",
    "en-US": "en-US",
    "ja": "ja-JP",
    "ja-JP": "ja-JP",
    "ko": "ko-KR",
    "ko-KR": "ko-KR",
}


@dataclass(frozen=True)
class LocaleContext:
    """语言上下文"""

    language: SupportedLanguage
    raw_accept_language: str | None = None
