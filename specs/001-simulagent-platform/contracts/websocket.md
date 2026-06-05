# WebSocket Contract: SimulAgent

**Protocol**: WebSocket (RFC 6455)
**URL**: `ws://localhost:8765/ws`
**Message Format**: JSON text frames (server↔client), binary frames (client→server, audio)

## Connection Lifecycle

```
Client                                Server
  │                                     │
  │──── ws://localhost:8765/ws ────────→│  Connect
  │←──── {"type":"connected","session_id":"..."} ──│
  │                                     │
  │──── {"type":"start_session",...} ──→│
  │←──── {"type":"session_started",...} ──│
  │                                     │
  │──── [binary audio frames] ─────────→│  (streaming loop)
  │←──── {"type":"asr_partial",...} ────│
  │←──── {"type":"translation_token",...}──│
  │←──── {"type":"subtitle_entry",...} ──│
  │←──── {"type":"revision",...} ───────│
  │                                     │
  │──── {"type":"stop_session"} ───────→│
  │←──── {"type":"session_ended",...} ──│
  │                                     │
  │──── close ─────────────────────────→│  Disconnect
```

## Client → Server Messages

### start_session
```json
{
  "type": "start_session",
  "config": {
    "source_language": "en",
    "target_language": "zh",
    "display_mode": "bilingual",
    "title": "Optional session name"
  }
}
```

### audio_chunk (binary)
Raw PCM audio data as binary WebSocket frame.
- Format: float32, 48000 Hz, 2-channel (from WASAPI loopback)
- Each frame: arbitrary size, typically 4800 samples (100ms)

### stop_session
```json
{
  "type": "stop_session"
}
```

### pause_session
```json
{
  "type": "pause_session"
}
```

### resume_session
```json
{
  "type": "resume_session"
}
```

### update_settings
```json
{
  "type": "update_settings",
  "settings": {
    "display_mode": "chinese_only",
    "font_size": 18,
    "window_opacity": 0.9
  }
}
```

### request_summary
```json
{
  "type": "request_summary"
}
```

## Server → Client Messages

### connected
```json
{
  "type": "connected",
  "session_id": null
}
```

### session_started
```json
{
  "type": "session_started",
  "session": {
    "id": "uuid",
    "source_language": "en",
    "target_language": "zh",
    "display_mode": "bilingual",
    "started_at": "2026-06-05T10:30:00Z"
  }
}
```

### asr_partial
Incremental transcription result (may be updated).
```json
{
  "type": "asr_partial",
  "segment_id": "uuid",
  "sequence_number": 42,
  "text": "The graph foundation model enables",
  "is_final": false,
  "timestamp_ms": 123456
}
```

### asr_final
Finalized transcription segment (will not change).
```json
{
  "type": "asr_final",
  "segment_id": "uuid",
  "sequence_number": 42,
  "text": "The graph foundation model enables zero-shot learning across domains.",
  "confidence": 0.94,
  "start_time_ms": 123000,
  "end_time_ms": 126500
}
```

### translation_token
Single token of streaming translation (incremental display).
```json
{
  "type": "translation_token",
  "segment_id": "uuid",
  "token": "图",
  "token_index": 0
}
```

### translation_complete
```json
{
  "type": "translation_complete",
  "segment_id": "uuid",
  "translation": "图基础模型实现了跨领域的零样本学习。",
  "terminology_applied": [
    {"source": "foundation model", "translation": "基础模型"},
    {"source": "zero-shot learning", "translation": "零样本学习"}
  ]
}
```

### subtitle_entry
Committed subtitle entry added to display history.
```json
{
  "type": "subtitle_entry",
  "entry": {
    "id": "uuid",
    "segment_id": "uuid",
    "sequence_number": 42,
    "source_text": "The graph foundation model enables zero-shot learning across domains.",
    "translated_text": "图基础模型实现了跨领域的零样本学习。",
    "is_revised": false,
    "timestamp_ms": 126500
  }
}
```

### revision
Historical subtitle entry has been revised.
```json
{
  "type": "revision",
  "entry_id": "uuid",
  "segment_id": "uuid",
  "sequence_number": 40,
  "old_translation": "图模型",
  "new_translation": "图基础模型",
  "reason": "context_clarification"
}
```

### session_status
```json
{
  "type": "session_status",
  "status": "active",
  "duration_seconds": 1234,
  "total_segments": 156
}
```

### session_ended
```json
{
  "type": "session_ended",
  "session_id": "uuid",
  "duration_seconds": 2700,
  "total_segments": 342,
  "ended_at": "2026-06-05T11:15:00Z"
}
```

### summary_ready
```json
{
  "type": "summary_ready",
  "summary_id": "uuid",
  "abstract": "This keynote covered recent advances in graph neural networks...",
  "key_viewpoints": ["..."],
  "term_glossary": [{"term": "...", "translation": "...", "context": "..."}],
  "action_items": [{"item": "...", "priority": "high"}]
}
```

### error
```json
{
  "type": "error",
  "code": "ASR_INIT_FAILED",
  "message": "Failed to initialize speech recognition model",
  "recoverable": false
}
```

## Error Codes

| Code | Recoverable | Description |
|------|-------------|-------------|
| `AUDIO_CAPTURE_FAILED` | Yes | Audio device disconnected; retry with fallback |
| `ASR_INIT_FAILED` | No | ASR model failed to load; check installation |
| `ASR_TIMEOUT` | Yes | ASR taking too long; skip current chunk |
| `TRANSLATION_FAILED` | Yes | LLM error; retry with fallback model |
| `TRANSLATION_TIMEOUT` | Yes | LLM timeout; use source text as passthrough |
| `SESSION_LIMIT_REACHED` | No | Cannot create more sessions |
| `INVALID_CONFIG` | Yes | Bad config values; provide corrected config |

## Binary Audio Frame Format

```
Byte layout (little-endian):
[float32 sample L] [float32 sample R] [float32 sample L] [float32 sample R] ...
```

- Sample rate: 48000 Hz
- Channels: 2 (stereo interleaved)
- Format: float32 (-1.0 to 1.0)
- Server converts to 16000 Hz mono before feeding to ASR
