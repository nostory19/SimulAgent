<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at `specs/001-simulagent-platform/plan.md`.

## Project Overview

**SimulAgent** — real-time simultaneous interpretation desktop app using multi-agent AI.
Windows 11 (primary), Python 3.10 (conda env: `simulagent`), FastAPI + Next.js + Electron.

### Key Design Docs
- Spec: `specs/001-simulagent-platform/spec.md`
- Plan: `specs/001-simulagent-platform/plan.md`
- Research: `specs/001-simulagent-platform/research.md`
- Data Model: `specs/001-simulagent-platform/data-model.md`
- Quickstart: `specs/001-simulagent-platform/quickstart.md`

### Tech Summary
- Audio capture: PyAudioWPatch + WASAPI loopback (captures any app audio at OS level)
- ASR: FunASR `paraformer-zh-streaming` (streaming, 150-300ms latency)
- Translation: Qwen3-8B via Ollama (streaming token-by-token, ~400-800ms)
- Agent pipeline: LangGraph StateGraph (ASR → Context → Translation → Revision → Terminology → Display)
- Backend: FastAPI + WebSocket (port 8765)
- Frontend: Next.js + React + Electron (floating always-on-top subtitle window)
- Storage: SQLite + Milvus Lite (local, embedded)
- Testing: pytest + pytest-asyncio (backend), Vitest + Playwright (frontend)
<!-- SPECKIT END -->
