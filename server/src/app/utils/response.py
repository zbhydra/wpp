"""
响应工具类
"""

from typing import Optional
from app.i18n import translator
from app.i18n.common_code import CommonCode
from app.i18n.dependencies import DEFAULT_LANGUAGE, LocaleContext
from fastapi.responses import JSONResponse


class ResponseUtils:
    @staticmethod
    def json(code: int, data: dict, msg: str) -> JSONResponse:
        """
        返回 JSON 响应
        """
        return JSONResponse(
            content={
                "code": code,
                "data": data,
                "msg": msg,
            },
        )

    @staticmethod
    def ok(data: dict | None = None) -> JSONResponse:
        """
        返回成功响应
        """
        return ResponseUtils.json(10000, data or {}, "success")

    @staticmethod
    def error(code: CommonCode,locale:Optional[LocaleContext]=None) -> JSONResponse:
        """
        返回错误响应
        """
        if locale is None:
            locale = LocaleContext(
                language = DEFAULT_LANGUAGE
            )
        
        message = translator.translate(
                str(code.name), locale.language
            )

        return ResponseUtils.json(code.value, {}, message)
