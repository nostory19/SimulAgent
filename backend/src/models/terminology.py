"""TerminologyEntry data model for domain-specific terms."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.sqlite import BLOB
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


def _utcnow():
    return datetime.now(timezone.utc)


class TerminologyEntry(Base):
    __tablename__ = "terminology_entries"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=True)
    source_term = Column(String(500), nullable=False)
    standard_translation = Column(String(500), nullable=False)
    domain = Column(String(100), nullable=True)
    source_document = Column(String(255), nullable=True)
    embedding = Column(BLOB, nullable=True)
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
