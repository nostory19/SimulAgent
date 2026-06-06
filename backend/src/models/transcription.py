"""
语音识别文本段数据模型 (TranscriptionSegment)。

记录 ASR 引擎输出的每一段识别文本，包含时间戳、置信度、
以及是否为增量结果（is_partial）的标记。
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class TranscriptionSegment(Base):
    """语音识别文本段表。每个 segment 对应一句话或一个语义单元。"""

    __tablename__ = "transcription_segments"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=False)
    sequence_number = Column(Integer, nullable=False)  # 会话内单调递增序号

    # ===== 识别文本 =====
    source_text = Column(Text, nullable=False)  # 原始语言文本
    start_time_ms = Column(Integer, nullable=False)  # 语音开始偏移（毫秒，相对于会话开始）
    end_time_ms = Column(Integer, nullable=False)  # 语音结束偏移
    confidence = Column(Float, nullable=True)  # ASR 置信度 (0.0-1.0)

    # ===== 增量识别 =====
    is_partial = Column(Boolean, default=False)  # True=增量部分结果, False=最终结果
    partial_of = Column(String(36), ForeignKey("transcription_segments.id"), nullable=True)
    # 如果此条 final 了之前的 partial segment，通过 partial_of 链接

    created_at = Column(DateTime, nullable=False, default=_utcnow)

    # ===== 关联关系 =====
    session = relationship("CaptureSession", back_populates="segments")
    translation = relationship(
        "TranslationEntry", back_populates="segment", uselist=False  # 一对一
    )
