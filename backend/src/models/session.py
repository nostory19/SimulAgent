"""CaptureSession data model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class CaptureSession(Base):
    __tablename__ = "capture_sessions"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    title = Column(String(255), nullable=True)
    source_language = Column(String(10), nullable=False, default="en")
    target_language = Column(String(10), nullable=False, default="zh")
    display_mode = Column(String(20), nullable=False, default="bilingual")
    status = Column(String(20), nullable=False, default="active")
    audio_source = Column(String(50), nullable=True)
    started_at = Column(DateTime, nullable=False, default=_utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    total_segments = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow)

    segments = relationship(
        "TranscriptionSegment", back_populates="session",
        order_by="TranscriptionSegment.sequence_number"
    )
    summary = relationship(
        "SessionSummary", back_populates="session", uselist=False
    )
