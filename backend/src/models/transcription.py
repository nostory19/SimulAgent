"""TranscriptionSegment data model."""
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
    __tablename__ = "transcription_segments"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    source_text = Column(Text, nullable=False)
    start_time_ms = Column(Integer, nullable=False)
    end_time_ms = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=True)
    is_partial = Column(Boolean, default=False)
    partial_of = Column(String(36), ForeignKey("transcription_segments.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=_utcnow)

    session = relationship("CaptureSession", back_populates="segments")
    translation = relationship(
        "TranslationEntry", back_populates="segment", uselist=False
    )
