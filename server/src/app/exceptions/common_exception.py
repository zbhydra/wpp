from app.i18n.common_code import CommonCode


class AppCommonException(Exception):
    """通用异常"""

    code: CommonCode

    def __init__(self, code: CommonCode):
        self.code = code


class UserAuthFailedException(Exception):
    """认证失败异常"""
