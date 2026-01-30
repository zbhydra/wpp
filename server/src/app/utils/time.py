from datetime import datetime, timezone
from typing import Any, Optional

# Time-related type definitions
Timestamp = int  # Millisecond timestamp
OptionalTimestamp = Optional[int]

# 使用服务器系统时区（None 表示使用本地时区）
_SYSTEM_TZ = None


def timestamp_now() -> Timestamp:
    """返回当前时间戳（毫秒级，使用服务器系统时区）"""
    return int(datetime.now(_SYSTEM_TZ).timestamp() * 1000)


def datetime_to_timestamp(dt: datetime) -> Timestamp:
    """将 datetime 对象转换为毫秒级时间戳"""
    if dt.tzinfo is None:
        # 如果没有时区信息，使用系统时区
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def timestamp_to_datetime(ts: Timestamp) -> datetime:
    """将毫秒级时间戳转换为 datetime 对象（本地时区）"""
    return datetime.fromtimestamp(ts / 1000, tz=None)


def timestamp_to_datetime_str(ts: Timestamp, format: str = "%Y-%m-%d %H:%M:%S") -> str:
    """将毫秒级时间戳转换为可读字符串"""
    dt = timestamp_to_datetime(ts)
    return dt.strftime(format)


def parse_timestamp_input(ts_input: Any) -> Timestamp:
    """
    解析各种输入格式为标准时间戳（毫秒级）

    支持的输入格式：
    - int/float: 假设为时间戳（秒或毫秒）
    - str: 尝试解析为ISO格式时间字符串
    - datetime: 直接转换

    Raises:
        ValueError: 无法解析的输入格式
        TypeError: 不支持的输入类型
    """
    if ts_input is None:
        raise ValueError("时间戳输入不能为 None")

    # 如果已经是时间戳（毫秒级）
    if isinstance(ts_input, int):
        # 判断是秒级还是毫秒级时间戳
        if ts_input < 10**10:  # 秒级时间戳
            return ts_input * 1000
        else:  # 毫秒级时间戳
            return ts_input

    # 如果是浮点数时间戳
    if isinstance(ts_input, float):
        # 假设是秒级时间戳（带小数部分）
        return int(ts_input * 1000)

    # 如果是字符串
    if isinstance(ts_input, str):
        ts_input = ts_input.strip()
        if not ts_input:
            raise ValueError("时间戳字符串不能为空")

        # 尝试解析为数字
        try:
            num = float(ts_input)
            if num < 10**10:  # 秒级时间戳
                return int(num * 1000)
            else:  # 毫秒级时间戳
                return int(num)
        except ValueError:
            # 尝试解析为ISO格式的日期时间字符串
            try:
                # 尝试多种日期格式
                formats = [
                    "%Y-%m-%d %H:%M:%S",
                    "%Y-%m-%dT%H:%M:%S",
                    "%Y-%m-%dT%H:%M:%S.%f",
                    "%Y-%m-%dT%H:%M:%SZ",
                    "%Y-%m-%dT%H:%M:%S.%fZ",
                    "%Y-%m-%d",
                ]

                for fmt in formats:
                    try:
                        dt = datetime.strptime(ts_input, fmt)
                        # 如果没有时区信息，使用系统时区
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        return int(dt.timestamp() * 1000)
                    except ValueError:
                        continue

                # 最后尝试使用 fromisoformat
                dt = datetime.fromisoformat(ts_input.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return int(dt.timestamp() * 1000)

            except Exception as e:
                raise ValueError(f"无法解析时间字符串 '{ts_input}': {e}")

    # 如果是 datetime 对象
    if isinstance(ts_input, datetime):
        return datetime_to_timestamp(ts_input)

    # 不支持的类型
    raise TypeError(f"不支持的时间戳输入类型: {type(ts_input)}")


def timestamp_now_datetime() -> datetime:
    """返回当前时间（datetime对象，使用服务器系统时区）"""
    return datetime.now(_SYSTEM_TZ)


def get_today_date() -> str:
    """返回今日日期字符串（YYYY-MM-DD 格式，使用服务器系统时区）"""
    return datetime.now(_SYSTEM_TZ).strftime("%Y-%m-%d")
