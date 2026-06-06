"""TranslationEntry data model with revision history."""
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
    __tablename__ = "translation_entries"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    segment_id = Column(String(36), ForeignKey("transcription_segments.id"), nullable=False)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=False)
    translated_text = Column(Text, nullable=False)
    is_revised = Column(Boolean, default=False)
    revision_count = Column(Integer, default=0)
    revision_history = Column(JSON, default=list)
    terminology_applied = Column(JSON, default=list)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow)

    segment = relationship("TranscriptionSegment", back_populates="translation")
