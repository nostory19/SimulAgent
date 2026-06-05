# Implementation Plan: SimulAgent Platform

**Branch**: `001-simulagent-platform` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-simulagent-platform/spec.md`

## Summary

构建基于多智能体协同的实时同声传译桌面应用。核心技术路线：系统音频采集 → FunASR 流式语音识别 → LangGraph 多智能体翻译流水线（上下文感知 + 动态修正 + 术语增强）→ 浮动字幕窗口展示。后端采用 FastAPI + WebSocket 实现实时流式通信，前端采用 Next.js + React 构建控制面板，通过 Electron 封装为跨平台桌面应用，以浮动字幕窗口形式覆盖在任意视频/会议应用之上。

## Technical Context

**Language/Version**: Python 3.10 (conda env: simulagent), TypeScript 5.x (frontend)

**Primary Dependencies**: FastAPI, uvicorn, WebSocket (server); FunASR / SenseVoice (ASR); LangGraph, LangChain (agent orchestration); Qwen3 via Ollama or transformers (LLM); Milvus Lite (vector DB, local mode); PyAudio / sounddevice (audio capture); Next.js, React 18, Tailwind CSS (frontend); Electron (desktop shell)

**Storage**: SQLite (local development, single-user) with migration path to PostgreSQL (multi-user server deployment). Milvus Lite for embedded vector storage.

**Testing**: pytest + pytest-asyncio (backend), Vitest + Playwright (frontend)

**Target Platform**: Windows 11 (primary), macOS (secondary), both as Electron desktop app

**Project Type**: Desktop application — Electron shell embedding a Next.js frontend, communicating with a local Python FastAPI backend via WebSocket

**Performance Goals**: Audio-to-subtitle latency ≤3s (target 1-2s); stable 4h+ continuous sessions; streaming partial results every 200-500ms; memory footprint <2GB for 4h session

**Constraints**: Local-first architecture (all AI models run locally, no cloud dependency for MVP); conda Python 3.10 environment; system audio capture must work with any browser/application output; floating subtitle window must stay on top without stealing focus

**Scale/Scope**: Single-user local desktop application (MVP); 5 user stories across 3 priority levels; 18 functional requirements; 4 supported source languages (EN/ZH/JA/KO) → Chinese target

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No project constitution defined (`.specify/memory/constitution.md` is still a template). No gates to enforce. Proceeding with standard best practices:

- Code quality: pytest for all backend logic, Vitest for frontend components
- Architecture: Clear separation between capture / ASR / translation / display layers
- Data privacy: Local-first, no audio data leaves the user's machine
- Documentation: All modules documented, quickstart guide for conda environment

**Post-Design Re-check**: Will verify after Phase 1 that data model and contracts align with these principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-simulagent-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── websocket.md     # WebSocket message contracts
│   └── api.md           # REST API contracts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── capture/           # Audio capture module
│   │   ├── __init__.py
│   │   ├── system_audio.py    # Windows/macOS system audio capture
│   │   └── device_manager.py  # Audio device detection & selection
│   ├── asr/               # Speech recognition module
│   │   ├── __init__.py
│   │   ├── funasr_engine.py   # FunASR / SenseVoice wrapper
│   │   └── stream_buffer.py   # Audio streaming buffer
│   ├── agents/            # LangGraph multi-agent pipeline
│   │   ├── __init__.py
│   │   ├── graph.py           # LangGraph state graph definition
│   │   ├── asr_agent.py       # ASR agent node
│   │   ├── context_agent.py   # Context window management
│   │   ├── translation_agent.py  # Translation with LLM
│   │   ├── revision_agent.py  # Dynamic subtitle revision
│   │   ├── terminology_agent.py  # RAG terminology lookup
│   │   └── summary_agent.py   # Post-session summarization
│   ├── models/            # SQLAlchemy / Pydantic models
│   │   ├── __init__.py
│   │   ├── database.py        # DB connection & session
│   │   ├── session.py         # CaptureSession model
│   │   ├── transcription.py   # TranscriptionSegment model
│   │   ├── translation.py     # TranslationEntry model
│   │   └── terminology.py     # TerminologyEntry model
│   ├── api/               # FastAPI routes & WebSocket
│   │   ├── __init__.py
│   │   ├── server.py          # FastAPI app entry point
│   │   ├── ws_handler.py      # WebSocket connection manager
│   │   ├── routes/
│   │   │   ├── session.py     # Session CRUD endpoints
│   │   │   ├── upload.py      # Document upload endpoints
│   │   │   └── summary.py     # Summary generation endpoints
│   │   └── middleware/
│   │       └── cors.py
│   └── main.py            # Application entry point
├── tests/
│   ├── unit/
│   │   ├── test_audio_capture.py
│   │   ├── test_asr_engine.py
│   │   ├── test_translation.py
│   │   └── test_agents.py
│   ├── integration/
│   │   ├── test_pipeline.py
│   │   └── test_websocket.py
│   └── fixtures/
│       └── sample_audio.py
├── requirements.txt
└── pyproject.toml

frontend/
├── src/
│   ├── components/
│   │   ├── SubtitleWindow.tsx    # Floating subtitle overlay
│   │   ├── ControlPanel.tsx      # Main control panel
│   │   ├── SessionHistory.tsx    # Past session list
│   │   ├── FileUpload.tsx        # Reference doc upload
│   │   ├── SummaryView.tsx       # Session summary display
│   │   └── SettingsPanel.tsx     # Display/language settings
│   ├── hooks/
│   │   ├── useWebSocket.ts       # WebSocket connection hook
│   │   └── useAudioCapture.ts    # Audio capture status hook
│   ├── services/
│   │   ├── api.ts                # REST API client
│   │   └── websocket.ts         # WebSocket client
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── app/
│       ├── layout.tsx
│       └── page.tsx
├── electron/
│   ├── main.ts                   # Electron main process
│   └── preload.ts                # Preload script
├── tests/
│   └── components/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js

data/                       # Local data storage (gitignored)
├── simulagent.db           # SQLite database
└── vectors/                # Milvus Lite vector storage
```

**Structure Decision**: Option 2 (Web application) — `backend/` for FastAPI Python server, `frontend/` for Next.js + Electron desktop app. The two communicate locally via WebSocket (real-time streaming) and REST (control operations). Electron wraps the Next.js frontend and provides system-tray integration and floating subtitle window capabilities.

## Complexity Tracking

> No constitution violations to track. Project structure is standard for a desktop app with local backend.
