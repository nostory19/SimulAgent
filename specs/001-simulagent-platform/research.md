# Research Report: SimulAgent Platform

**Created**: 2026-06-05 | **Phase**: 0 — Technical Research

## 1. System Audio Capture on Windows

### Decision: PyAudioWPatch + WASAPI Loopback (Callback Pattern)

**Rationale**: WASAPI loopback creates a virtual input device that mirrors the Windows audio mix (all sounds playing through speakers/headphones). This captures audio from any application — browser, Zoom, media player — without per-app integration. The user simply plays content normally and SimulAgent captures it at the OS level.

**Key details**:
- Library: `PyAudioWPatch` (`pip install PyAudioWPatch`), a PyAudio fork with WASAPI loopback support
- Mix format is always **float32, 48000 Hz, 2-channel** — must match exactly
- Use `get_default_wasapi_loopback()` for automatic device discovery
- Callback pattern recommended: audio arrives on a real-time thread, handed off via `collections.deque` to main thread
- Pitfalls: muted speakers = silent loopback (lower volume instead of muting); Bluetooth headsets produce empty buffers during calls; avoid frequent stream start/stop

**Alternatives considered**:
- `sounddevice` + manual WASAPI setup: works but more boilerplate
- `ffmpeg` subprocess: good for file recording, poor for in-process streaming
- Virtual Audio Cable: requires user to install third-party driver

**How it works for video websites**: User opens YouTube in Chrome → audio plays through speakers → WASAPI loopback captures it → SimulAgent processes it → subtitles appear in floating window above Chrome. Zero integration with the video website required.

## 2. Real-Time Speech Recognition (ASR)

### Decision: FunASR `paraformer-zh-streaming` with FSMN-VAD

**Rationale**: This is the only FunASR model with native streaming support. It handles both Chinese and English (English as secondary language, CER ~6.5%). For pure-English scenarios where higher accuracy is needed, SenseVoiceSmall can serve as a batch fallback with VAD-based quasi-streaming.

**Key details**:
- Model: `paraformer-zh-streaming` (220M params), loaded via `funasr.AutoModel`
- Chunk size: `[0, 10, 5]` = 600ms current chunk + 300ms lookahead (in 60ms frame units)
- Tuning: `[0, 8, 4]` = 480ms chunk for lower latency at slight accuracy cost
- Stateful API: pass same `cache` dict across calls; `is_final=True` on last chunk to flush
- VAD: `fsmn-vad` integrated via `vad_model="fsmn-vad"` parameter
- Expected latency: 150-300ms first-token (dominated by 600ms audio accumulation), 5-15ms per subsequent chunk on GPU
- Audio input: 16kHz mono, resampled from 48kHz WASAPI capture

**Alternatives considered**:
- `SenseVoiceSmall` (batch): very fast but no true streaming; requires VAD to segment first
- Whisper + Silero VAD: better English accuracy but 1-2s latency, no native streaming
- 2-pass (streaming + batch correction): best accuracy but adds complexity; deferred to Phase 2

**Fallback strategy**: If `paraformer-zh-streaming` English accuracy is insufficient, switch to `SenseVoiceSmall` with FSMN-VAD in quasi-streaming mode (transcribe each VAD-detected segment as it completes).

## 3. Local LLM Translation

### Decision: Qwen3-8B Q4_K_M via Ollama (Primary), Qwen3-4B Q8_0 (Fallback)

**Rationale**: Ollama provides the best balance of low latency, ease of setup, and Python integration for a local desktop app. Single-command model pull, OpenAI-compatible streaming API, and smooth model hot-swapping.

**Key details**:
- Primary model: `qwen3:8b-q4_K_M` (~5.2GB, needs 12GB VRAM for GPU inference)
- Fallback model: `qwen3:4b-q8_0` (~4.4GB, works on 6GB VRAM or CPU with 16GB RAM)
- Serving: Ollama with `stream: true` for token-by-token output
- TTFT (Time-To-First-Token): ~45ms via Ollama
- End-to-end translation: ~400-800ms for typical subtitle-length (20-30 output tokens) on RTX 4070+
- Streaming integration: each token → WebSocket → frontend incremental rendering

**Prompt template**:
```
System: You are a professional simultaneous interpreter translating from English to Simplified Chinese. Rules: Produce only the Chinese translation. Use natural, fluent Chinese. Maintain consistency with previous translations. Preserve proper nouns and acronyms in original form. Keep translation concise.

Recent context: {last_3_translation_pairs}

User: Translate: {new_transcription_text}
```

**Alternatives considered**:
- `llama-cpp-python`: 20-50% lower TTFT (in-process, no HTTP overhead) but more setup; future optimization path
- `vLLM`: higher TTFT (~82ms), overkill for single-user local app
- `Qwen3-LiveTranslate-Flash`: purpose-built for real-time translation but cloud-only (DashScope API), violates local-first constraint
- `Qwen3-XPlus-8B`: translation-tuned variant with better quality, but requires custom GGUF conversion

## 4. Multi-Agent Pipeline (LangGraph)

### Decision: LangGraph StateGraph with Streaming Custom Events

**Rationale**: LangGraph provides the right abstraction level for a linear pipeline with conditional branches (revision loop). The `get_stream_writer()` mechanism enables real-time partial output from any node, and the state management with typed reducers handles the shared context window cleanly.

**Graph structure**:
```
START → ASR → Context → Translation → Revision → Terminology → Display → END
                              ↑              │
                              └── re-translate (max 3 loops)
```

**Key mechanisms**:
- **State**: `TypedDict` with `Annotated[List, operator.add]` reducers for accumulating context_window and asr_chunks
- **Streaming**: `get_stream_writer()` inside nodes to emit `asr:chunk`, `translation:token` custom events
- **Conditional routing**: `route_revision()` reads state, returns `"translate_again"` or `"apply_terms"`, with max-3-iterations guard
- **Context management**: Rolling window of last 3-5 translation pairs, injected into translation prompts
- **Fault tolerance**: `RetryPolicy(max_attempts=3)` + `TimeoutPolicy(run_timeout=30, idle_timeout=5)` on all nodes
- **Runtime context**: `PipelineContext` with `term_cache: dict` for terminology injection without polluting state

**Consumption pattern**:
```python
async for mode, chunk in compiled.astream(input, stream_mode=["updates", "custom", "messages"]):
    if mode == "custom":   # ASR partials, translation tokens
        yield via WebSocket
    elif mode == "updates":  # Node completion notifications
        yield via WebSocket
```

**Alternatives considered**:
- Manual async pipeline (no framework): more control but reinvents state management, error handling, streaming
- CrewAI: higher-level but less flexible for real-time streaming
- Custom event-driven architecture: maximum control but significant boilerplate

## 5. WebSocket Real-Time Communication

### Decision: FastAPI WebSocket with JSON Message Protocol

**Rationale**: WebSocket provides full-duplex, low-latency communication ideal for streaming audio chunks (client→server) and real-time subtitle updates (server→client). FastAPI has first-class WebSocket support with async handlers.

**Message types** (server → client):
- `asr_partial`: incremental transcription text
- `translation_token`: single translated token (incremental display)
- `translation_complete`: full sentence translation
- `revision`: revised translation for earlier subtitle entry
- `subtitle_entry`: final subtitle entry committed to history
- `session_status`: connection state, errors

**Message types** (client → server):
- `start_session`: begin capture with config (source_lang, target_lang, display_mode)
- `stop_session`: end capture
- `audio_chunk`: raw audio data (binary frame or base64)
- `update_settings`: change display mode, font size, etc.
- `request_summary`: trigger post-session summary generation

## 6. Floating Subtitle Window

### Decision: Electron Frameless Always-On-Top Window

**Rationale**: Electron provides a native always-on-top window that can be styled as a transparent overlay. This sits above the browser/video without stealing focus, allowing the user to watch content and read subtitles simultaneously.

**Key implementation details**:
- `alwaysOnTop: true` + `focusable: false` (or minimal) so the window doesn't steal keyboard focus from the browser
- `transparent: true` + `frame: false` for a clean overlay look
- CSS: semi-transparent background, customizable font size/color/opacity
- Position: bottom-center of screen (default), user-draggable to reposition
- The Electron main process manages the subtitle window lifecycle; the Next.js renderer handles the UI

## 7. Vector Storage for Terminology (RAG)

### Decision: Milvus Lite (Embedded Mode)

**Rationale**: Milvus Lite runs in-process (no Docker, no server), stores vectors on local disk, and provides the same API as Milvus server. Perfect for a local desktop app. When terminology documents are uploaded, text is chunked, embedded (using Qwen3 or a lightweight embedding model), and stored in Milvus Lite. During translation, the terminology agent queries for matching terms and injects standard translations.

**Alternatives considered**:
- ChromaDB: simpler but less performant for real-time retrieval
- FAISS: fast but no persistence, no metadata filtering
- SQLite FTS5 + embedding: viable but reinvents vector search

## Summary of Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Audio Capture | PyAudioWPatch + WASAPI loopback | Captures any app audio at OS level |
| ASR | FunASR paraformer-zh-streaming | Only streaming model, 150-300ms latency |
| Translation LLM | Qwen3-8B via Ollama | 45ms TTFT, streaming, local deployment |
| Agent Framework | LangGraph StateGraph | Streaming, conditional routing, fault tolerance |
| Real-time Comm | FastAPI WebSocket | Full-duplex, low latency, async |
| Subtitle Display | Electron always-on-top | System-level overlay, no focus stealing |
| Vector DB | Milvus Lite | Embedded, persistent, real-time retrieval |
| Local Storage | SQLite | Zero-config, single-file, sufficient for single-user |
