# REST API Contract: SimulAgent

**Base URL**: `http://localhost:8765/api/v1`
**Content-Type**: `application/json`

## Endpoints

### Sessions

#### GET /sessions
List all capture sessions, ordered by most recent first.

**Response 200**:
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "NVIDIA GTC 2026 Keynote",
      "source_language": "en",
      "target_language": "zh",
      "display_mode": "bilingual",
      "status": "completed",
      "started_at": "2026-06-05T09:00:00Z",
      "ended_at": "2026-06-05T10:30:00Z",
      "duration_seconds": 5400,
      "total_segments": 895
    }
  ],
  "total": 12
}
```

**Query params**:
- `limit` (int, default 20): Max sessions to return
- `offset` (int, default 0): Pagination offset
- `status` (string, optional): Filter by status (`active`, `completed`, `error`)

---

#### GET /sessions/{session_id}
Get a single session with summary statistics.

**Response 200**:
```json
{
  "id": "uuid",
  "title": "NVIDIA GTC 2026 Keynote",
  "source_language": "en",
  "target_language": "zh",
  "display_mode": "bilingual",
  "status": "completed",
  "started_at": "2026-06-05T09:00:00Z",
  "ended_at": "2026-06-05T10:30:00Z",
  "duration_seconds": 5400,
  "total_segments": 895,
  "revised_segments": 23,
  "has_summary": true
}
```

**Response 404**:
```json
{
  "error": "Session not found",
  "session_id": "uuid"
}
```

---

#### DELETE /sessions/{session_id}
Delete a session and all associated data (segments, translations, summary).

**Response 200**:
```json
{
  "deleted": true,
  "session_id": "uuid"
}
```

---

### Segments & Subtitles

#### GET /sessions/{session_id}/subtitles
Get subtitle history for a session.

**Query params**:
- `limit` (int, default 100): Max entries
- `offset` (int, default 0): Pagination (offset from most recent or from start)
- `order` (string, default "asc"): `asc` (chronological) or `desc` (reverse)
- `include_revisions` (bool, default false): Include full revision history

**Response 200**:
```json
{
  "session_id": "uuid",
  "subtitles": [
    {
      "id": "uuid",
      "sequence_number": 1,
      "source_text": "Welcome everyone.",
      "translated_text": "欢迎大家。",
      "is_revised": false,
      "revision_count": 0,
      "start_time_ms": 1500,
      "created_at": "2026-06-05T09:00:02Z"
    },
    {
      "id": "uuid",
      "sequence_number": 2,
      "source_text": "Today I will talk about graph neural networks.",
      "translated_text": "今天我将讨论图神经网络。",
      "is_revised": true,
      "revision_count": 1,
      "revision_history": [
        {
          "timestamp": "2026-06-05T09:00:05Z",
          "old_text": "今天我将讨论图形神经网络。",
          "new_text": "今天我将讨论图神经网络。"
        }
      ],
      "start_time_ms": 4500,
      "created_at": "2026-06-05T09:00:05Z"
    }
  ],
  "total": 895
}
```

---

### Document Upload (Terminology)

#### POST /sessions/{session_id}/documents
Upload reference documents for terminology extraction. Multipart form upload.

**Request**: `multipart/form-data`
- `file`: Document file (PDF, PPTX, DOCX, TXT)
- `domain` (optional string): Domain hint for better extraction

**Response 200**:
```json
{
  "document_id": "uuid",
  "filename": "conference_program.pdf",
  "terms_extracted": 47,
  "terms": [
    {"source": "attention mechanism", "translation": "注意力机制"},
    {"source": "backpropagation", "translation": "反向传播"}
  ]
}
```

**Response 400** (unsupported format):
```json
{
  "error": "Unsupported file format",
  "filename": "image.png",
  "supported_formats": ["pdf", "pptx", "docx", "txt"]
}
```

---

#### GET /sessions/{session_id}/terminology
List all terminology entries for a session.

**Response 200**:
```json
{
  "session_id": "uuid",
  "terms": [
    {
      "id": "uuid",
      "source_term": "backpropagation",
      "standard_translation": "反向传播",
      "source_document": "deep_learning_glossary.pdf",
      "hit_count": 12
    }
  ],
  "total": 47
}
```

---

#### DELETE /sessions/{session_id}/documents/{document_id}
Remove a document and its extracted terms.

**Response 200**:
```json
{
  "deleted": true,
  "document_id": "uuid"
}
```

---

### Summary

#### POST /sessions/{session_id}/summary
Generate a session summary. This may take several seconds.

**Response 200**:
```json
{
  "summary_id": "uuid",
  "session_id": "uuid",
  "abstract": "This keynote covered recent advances in graph neural networks, focusing on three main areas: scalability to billion-node graphs, multi-modal graph learning, and applications in drug discovery.",
  "key_viewpoints": [
    "Graph neural networks can now scale to billion-node graphs using sampling-based training",
    "Multi-modal fusion with graphs enables richer representations for recommendation systems",
    "Drug discovery is the most promising real-world application of GNNs today"
  ],
  "term_glossary": [
    {"term": "graph neural network", "translation": "图神经网络", "context": "Core topic of the keynote"},
    {"term": "message passing", "translation": "消息传递", "context": "Fundamental operation in GNNs"}
  ],
  "action_items": [
    {"item": "Try the open-source GNN framework mentioned by the speaker", "priority": "high"},
    {"item": "Read the referenced paper on scalable GNN training", "priority": "medium"}
  ],
  "generated_at": "2026-06-05T10:31:00Z"
}
```

**Response 409** (session still active):
```json
{
  "error": "Cannot generate summary for active session",
  "session_status": "active"
}
```

**Response 400** (session too short):
```json
{
  "error": "Session too short for meaningful summary",
  "min_duration_seconds": 120,
  "actual_duration_seconds": 45
}
```

---

#### GET /sessions/{session_id}/summary
Retrieve previously generated summary.

**Response 200**: Same as POST response.
**Response 404**: No summary generated yet.

---

### System

#### GET /health
Health check endpoint.

**Response 200**:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "models": {
    "asr": "ready",
    "translation": "ready"
  },
  "uptime_seconds": 3600
}
```

#### GET /system/audio-devices
List available audio capture devices (for troubleshooting).

**Response 200**:
```json
{
  "default_loopback": {
    "name": "Speakers (Realtek) [Loopback]",
    "index": 3,
    "sample_rate": 48000,
    "channels": 2
  },
  "all_devices": [
    {"name": "Microphone (Realtek)", "index": 0, "max_input_channels": 1, "host_api": "MME"},
    {"name": "Speakers (Realtek) [Loopback]", "index": 3, "max_input_channels": 2, "host_api": "WASAPI"}
  ]
}
```
