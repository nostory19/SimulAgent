"""
采集会话数据模型 (CaptureSession)。

表示一次连续的音频采集和翻译会话，记录源语言、目标语言、
显示模式、会话状态和时间信息。
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from .database import Base


def _gen_uuid():
    """生成 UUID 主键字符串。"""
    return str(uuid.uuid4())


def _utcnow():
    """返回当前 UTC 时间，去除时区信息以兼容 SQLite。"""
    return datetime.now(timezone.utc)


class CaptureSession(Base):
    """采集会话表，记录一次完整的使用会话。"""

    __tablename__ = "capture_sessions"

    # ===== 基本标识 =====
    id = Column(String(36), primary_key=True, default=_gen_uuid)
    user_id = Column(String(36), nullable=True, index=True)  # 关联用户（登录用户才有）
    title = Column(String(255), nullable=True)  # 用户自定义标题或自动生成

    # ===== 语言配置 =====
    source_language = Column(String(10), nullable=False, default="en")  # 源语言代码
    target_language = Column(String(10), nullable=False, default="zh")  # 目标语言代码
    display_mode = Column(String(20), nullable=False, default="bilingual")  # bilingual / chinese_only

    # ===== 会话状态 =====
    status = Column(String(20), nullable=False, default="active")  # active / paused / completed / error
    audio_source = Column(String(50), nullable=True)  # 采集的音频设备名称

    # ===== 时间统计 =====
    started_at = Column(DateTime, nullable=False, default=_utcnow)
    ended_at = Column(DateTime, nullable=True)  # 会话结束时填充
    duration_seconds = Column(Integer, nullable=True)  # 会话总时长（秒）
    total_segments = Column(Integer, default=0)  # 识别到的文本段总数

    # ===== 审计字段 =====
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow)

    # ===== 关联关系 =====
    segments = relationship(
        "TranscriptionSegment", back_populates="session",
        order_by="TranscriptionSegment.sequence_number"
    )
    summary = relationship(
        "SessionSummary", back_populates="session", uselist=False  # 一对一
    )
