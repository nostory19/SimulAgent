"""SessionSummary data model for AI-generated post-session summaries."""
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
    __tablename__ = "session_summaries"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), unique=True, nullable=False)
    abstract = Column(Text, nullable=False)
    key_viewpoints = Column(JSON, nullable=False)
    term_glossary = Column(JSON, nullable=False)
    action_items = Column(JSON, nullable=False)
    generated_at = Column(DateTime, nullable=False, default=_utcnow)
    segment_range = Column(JSON, nullable=True)

    session = relationship("CaptureSession", back_populates="summary")
