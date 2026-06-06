"""
翻译条目数据模型 (TranslationEntry)。

存储每个语音段的中文翻译，支持翻译修正历史（revision_history）
和术语应用记录（terminology_applied）。
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class TranslationEntry(Base):
    """翻译条目表，每个 TranscriptionSegment 对应一条翻译记录。"""

    __tablename__ = "translation_entries"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    segment_id = Column(String(36), ForeignKey("transcription_segments.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=False)

    # ===== 翻译文本 =====
    translated_text = Column(Text, nullable=False)  # 当前最新中文翻译

    # ===== 修正追踪 =====
    is_revised = Column(Boolean, default=False)  # 是否被修正过
    revision_count = Column(Integer, default=0)  # 修正次数
    revision_history = Column(JSON, default=list)  # 修正历史：
    # [{"timestamp": "...", "old_text": "...", "new_text": "...", "reason": "..."}]

    # ===== 术语应用 =====
    terminology_applied = Column(JSON, default=list)  # 应用的术语列表：
    # [{"source_term": "...", "matched_translation": "...", "source_document": "..."}]

    # ===== 审计 =====
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow)

    segment = relationship("TranscriptionSegment", back_populates="translation")
