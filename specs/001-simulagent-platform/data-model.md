# Data Model: SimulAgent Platform

**Created**: 2026-06-05 | **Phase**: 1 — Design

## Entity-Relationship Diagram

```
CaptureSession (1) ─────< (N) TranscriptionSegment
      │                            │
      │                            └──< (N) TranslationEntry (1:1 with segment)
      │
      └──< (N) TerminologyEntry (session-scoped)
      │
      └──< (1) SessionSummary (optional, generated on demand)
```

## Table Definitions

### 1. CaptureSession

Core session entity representing a continuous audio capture and translation period.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique session identifier |
| `title` | VARCHAR(255) | nullable | User-provided or auto-generated session name |
| `source_language` | VARCHAR(10) | NOT NULL, default 'en' | Source language code (en/zh/ja/ko) |
| `target_language` | VARCHAR(10) | NOT NULL, default 'zh' | Target language code (always 'zh' for MVP) |
| `display_mode` | VARCHAR(20) | NOT NULL, default 'bilingual' | 'chinese_only' or 'bilingual' |
| `status` | VARCHAR(20) | NOT NULL, default 'active' | 'active', 'paused', 'completed', 'error' |
| `audio_source` | VARCHAR(50) | nullable | Which audio device was captured |
| `started_at` | DATETIME | NOT NULL | Session start timestamp (UTC) |
| `ended_at` | DATETIME | nullable | Session end timestamp |
| `duration_seconds` | INTEGER | nullable | Computed on session end |
| `total_segments` | INTEGER | default 0 | Count of transcription segments |
| `created_at` | DATETIME | NOT NULL, default now | Record creation time |
| `updated_at` | DATETIME | NOT NULL, default now | Last update time |

**State transitions**:
```
active ──→ paused ──→ active  (user pause/resume)
active ──→ completed           (user stops session)
active ──→ error               (capture/ASR failure)
paused ──→ completed           (user stops while paused)
paused ──→ error               (system error while paused)
```

### 2. TranscriptionSegment

A timed segment of recognized speech text from ASR.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique segment identifier |
| `session_id` | UUID | FK → CaptureSession.id, NOT NULL | Parent session |
| `sequence_number` | INTEGER | NOT NULL | Monotonic order within session |
| `source_text` | TEXT | NOT NULL | Original language transcription |
| `start_time_ms` | INTEGER | NOT NULL | Audio offset when speech started (ms from session start) |
| `end_time_ms` | INTEGER | NOT NULL | Audio offset when speech ended |
| `confidence` | FLOAT | 0.0-1.0, nullable | ASR confidence score |
| `is_partial` | BOOLEAN | default false | True for incremental/partial results before finalized |
| `partial_of` | UUID | FK → TranscriptionSegment.id, nullable | If this finalizes a partial segment, links back |
| `created_at` | DATETIME | NOT NULL | When this segment was recognized |

**Index**: `(session_id, sequence_number)` for ordered retrieval.

### 3. TranslationEntry

Translation of a transcription segment, with revision history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique entry identifier |
| `segment_id` | UUID | FK → TranscriptionSegment.id, NOT NULL | Source segment |
| `session_id` | UUID | FK → CaptureSession.id, NOT NULL | Denormalized for query convenience |
| `translated_text` | TEXT | NOT NULL | Current (latest) Chinese translation |
| `is_revised` | BOOLEAN | default false | Has this entry been revised at least once? |
| `revision_count` | INTEGER | default 0 | How many times revised |
| `revision_history` | JSON | default [] | Array of {timestamp, old_text, new_text, reason} |
| `terminology_applied` | JSON | default [] | Array of {source_term, matched_translation} that were applied |
| `created_at` | DATETIME | NOT NULL | First translation time |
| `updated_at` | DATETIME | NOT NULL | Last revision time |

**revision_history JSON structure**:
```json
[
  {
    "timestamp": "2026-06-05T10:30:15Z",
    "old_text": "图模型",
    "new_text": "图基础模型",
    "reason": "Later context revealed 'foundation model'"
  }
]
```

**terminology_applied JSON structure**:
```json
[
  {
    "source_term": "backpropagation",
    "matched_translation": "反向传播",
    "source_document": "deep_learning_glossary.pdf"
  }
]
```

### 4. TerminologyEntry

Domain-specific term extracted from uploaded reference materials.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique entry identifier |
| `session_id` | UUID | FK → CaptureSession.id, nullable | Scoped to session (null = global) |
| `source_term` | VARCHAR(500) | NOT NULL | Original language term |
| `standard_translation` | VARCHAR(500) | NOT NULL | Standard translation from reference |
| `domain` | VARCHAR(100) | nullable | Domain category (medical, tech, legal, etc.) |
| `source_document` | VARCHAR(255) | nullable | Which uploaded file this came from |
| `embedding` | BLOB | nullable | Vector embedding of source_term for similarity search |
| `hit_count` | INTEGER | default 0 | Times this term was matched during translation |
| `created_at` | DATETIME | NOT NULL | When term was extracted |

**Index**: `(session_id, source_term)` for lookup during translation.

### 5. SessionSummary

Post-session AI-generated summary.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique summary identifier |
| `session_id` | UUID | FK → CaptureSession.id, UNIQUE, NOT NULL | One summary per session |
| `abstract` | TEXT | NOT NULL | Concise session abstract |
| `key_viewpoints` | JSON | NOT NULL | Array of key viewpoints |
| `term_glossary` | JSON | NOT NULL | Array of {term, translation, context} |
| `action_items` | JSON | NOT NULL | Array of {item, assignee_context, priority} |
| `generated_at` | DATETIME | NOT NULL | When summary was generated |
| `segment_range` | JSON | nullable | {first_segment_id, last_segment_id} covered |

**key_viewpoints JSON structure**:
```json
[
  "Transformer architecture remains dominant for sequence modeling",
  "Multi-modal fusion is the next frontier for general AI systems"
]
```

**term_glossary JSON structure**:
```json
[
  {"term": "attention mechanism", "translation": "注意力机制", "context": "Core component of transformer models"},
  {"term": "backpropagation", "translation": "反向传播", "context": "Training algorithm for neural networks"}
]
```

**action_items JSON structure**:
```json
[
  {"item": "Read the BERT paper for deeper understanding", "assignee_context": "mentioned as foundational reading", "priority": "medium"},
  {"item": "Check out the open-source implementation on GitHub", "assignee_context": "speaker referenced github.com/example/repo", "priority": "high"}
]
```

## SQLAlchemy Model Example (Python)

```python
# backend/src/models/session.py

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.sqlite import BLOB
from sqlalchemy.orm import relationship
from .database import Base

def gen_uuid():
    return str(uuid.uuid4())

def utcnow():
    return datetime.now(timezone.utc)

class CaptureSession(Base):
    __tablename__ = "capture_sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    title = Column(String(255), nullable=True)
    source_language = Column(String(10), nullable=False, default="en")
    target_language = Column(String(10), nullable=False, default="zh")
    display_mode = Column(String(20), nullable=False, default="bilingual")
    status = Column(String(20), nullable=False, default="active")
    audio_source = Column(String(50), nullable=True)
    started_at = Column(DateTime, nullable=False, default=utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    total_segments = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    segments = relationship("TranscriptionSegment", back_populates="session", order_by="TranscriptionSegment.sequence_number")
    summary = relationship("SessionSummary", back_populates="session", uselist=False)

class TranscriptionSegment(Base):
    __tablename__ = "transcription_segments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("capture_sessions.id"), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    source_text = Column(Text, nullable=False)
    start_time_ms = Column(Integer, nullable=False)
    end_time_ms = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=True)
    is_partial = Column(Boolean, default=False)
    partial_of = Column(String(36), ForeignKey("transcription_segments.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    session = relationship("CaptureSession", back_populates="segments")
    translation = relationship("TranslationEntry", back_populates="segment", uselist=False)
```

## Migration Strategy

- **Local (MVP)**: SQLite with SQLAlchemy — auto-creates tables on first run, zero configuration
- **Server (future)**: PostgreSQL via SQLAlchemy — same models, change connection string only
- **Vector storage**: Milvus Lite (embedded, files stored in `data/vectors/`), independent of SQLite
