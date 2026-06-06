"""
会话总结数据模型 (SessionSummary)。

存储 AI 生成的会后总结，包含摘要、核心观点、术语表和行动项。
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class SessionSummary(Base):
    """AI 会话总结表，一个会话最多有一条总结。"""

    __tablename__ = "session_summaries"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), unique=True, nullable=False)

    # ===== 总结内容 =====
    abstract = Column(Text, nullable=False)  # 摘要概述
    key_viewpoints = Column(JSON, nullable=False)  # 核心观点列表：["观点1", "观点2"]
    term_glossary = Column(JSON, nullable=False)  # 术语表：[{"term":"...", "translation":"...", "context":"..."}]
    action_items = Column(JSON, nullable=False)  # 行动项：[{"item":"...", "priority":"high/medium/low"}]

    # ===== 审计 =====
    generated_at = Column(DateTime, nullable=False, default=_utcnow)
    segment_range = Column(JSON, nullable=True)  # 总结覆盖的 segment 范围：{first_id, last_id}

    session = relationship("CaptureSession", back_populates="summary")
