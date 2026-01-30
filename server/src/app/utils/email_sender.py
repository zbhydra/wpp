"""邮件发送工具类 - 支持 SMTP 异步发送."""

import asyncio
from email.message import EmailMessage
from pathlib import Path

import aiosmtplib

from app.constants.auth import EMAIL_SEND_RETRY_DELAY
from app.core.config import settings
from app.core.singleton import singleton
from app.i18n.dependencies import DEFAULT_LANGUAGE, SupportedLanguage
from app.i18n.translator import translator
from app.utils.logger import logger


@singleton
class EmailSender:
    """邮件发送工具类."""

    def __init__(self) -> None:
        self.config = settings.smtp
        # 模板文件路径: backend/src/app/templates/email_verification.html
        self.template_path = (
            Path(__file__).parent.parent / "templates" / "email_verification.html"
        )

    def _load_html_template(
        self, code: str, language: SupportedLanguage = DEFAULT_LANGUAGE
    ) -> str:
        """加载 HTML 模板并替换验证码和多语言文本.

        Args:
            code: 验证码
            language: 语言代码

        Returns:
            渲染后的 HTML 内容
        """
        html_content = self.template_path.read_text(encoding="utf-8")

        # 替换验证码
        html_content = html_content.replace("{code}", code)

        # 替换多语言文本
        replacements = {
            "{title}": translator.translate("email.title", language),
            "{greeting}": translator.translate("email.greeting", language),
            "{instruction}": translator.translate("email.instruction", language),
            "{your_code}": translator.translate("email.your_code", language),
            "{valid_for}": translator.translate("email.valid_for", language),
            "{security_title}": translator.translate("email.security_title", language),
            "{security_content}": translator.translate(
                "email.security_content", language
            ),
            "{ignore_message}": translator.translate("email.ignore_message", language),
            "{auto_send_notice}": translator.translate(
                "email.auto_send_notice", language
            ),
            "{brand_name}": translator.translate("email.brand_name", language),
            "{brand_slogan}": translator.translate("email.brand_slogan", language),
        }

        for placeholder, text in replacements.items():
            html_content = html_content.replace(placeholder, text)

        return html_content

    async def send_verify_code(
        self,
        to_email: str,
        code: str,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        retry_times: int = 3,
    ) -> bool:
        """发送验证码邮件.

        Args:
            to_email: 收件人邮箱
            code: 验证码
            language: 语言代码
            retry_times: 重试次数

        Returns:
            是否发送成功
        """
        html_body = self._load_html_template(code, language)
        logger.info(f"send_verify_code: {code}")
        subject = translator.translate("email.subject", language)

        for attempt in range(retry_times):
            try:
                await self._send_email(
                    to_email=to_email,
                    subject=subject,
                    html_body=html_body,
                )
                logger.info(f"Verification code sent to {to_email}")
                return True

            except Exception as e:
                delay = EMAIL_SEND_RETRY_DELAY * (2**attempt)
                logger.warning(
                    f"Email send attempt {attempt + 1} failed for {to_email}: {e}, "
                    f"retrying in {delay}s...",
                )
                if attempt < retry_times - 1:
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Failed to send email to {to_email} after {retry_times} attempts",
                    )
                    return False

        return False

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
    ) -> None:
        """发送邮件的底层方法.

        Args:
            to_email: 收件人邮箱
            subject: 邮件主题
            html_body: 邮件 HTML 正文
        """
        # 构建邮件
        message = EmailMessage()
        message["From"] = f"{self.config.from_name} <{self.config.from_email}>"
        message["To"] = to_email
        message["Subject"] = subject
        # 设置 HTML 内容，同时添加纯文本备用
        message.set_content(html_body, subtype="html")

        # 使用 aiosmtplib 异步发送
        # 端口 587: STARTTLS (start_tls=True)
        # 端口 465: SSL/TLS (use_tls=True)
        print(self.config)
        await aiosmtplib.send(
            message,
            hostname=self.config.host,
            port=self.config.port,
            username=self.config.username,
            password=self.config.password,
            start_tls=(self.config.port == 587),
            use_tls=(self.config.port == 465),
            timeout=self.config.timeout,
        )


# 全局邮件发送实例
email_sender = EmailSender()
