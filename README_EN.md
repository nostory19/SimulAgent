[简体中文](README.md) | [English](README_EN.md)

<div align="center">

![Python 3.10](https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![DashScope](https://img.shields.io/badge/DashScope-Bailian-FF6A00?style=flat-square&logo=alibabacloud&logoColor=white)
![MiMo TTS](https://img.shields.io/badge/MiMo-TTS-FF6900?style=flat-square&logo=xiaomi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

<br />

<div align="center">
  <h1>SimulAgent</h1>
  <p><b>Real-Time Simultaneous Interpretation Web App Powered by Multi-Agent AI</b></p>
  <p>LangGraph multi-agent pipeline meets streaming ASR for zero-delay cross-language communication</p>
</div>

<p align="center">
  System Audio Capture · Streaming ASR · Multi-Agent Translation · Dynamic Subtitle Revision · Terminology Enhancement · TTS Playback
</p>

<p align="center">
  <a href="#-highlights">Highlights</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-project-structure">Project Structure</a>
</p>

---

## Highlights

- **Zero-Delay Interpretation** — System-level audio capture + DashScope streaming ASR, audio-to-subtitle latency ≤3s with partial results refreshing every 200-500ms
- **Multi-Agent Collaboration** — LangGraph StateGraph orchestrates a 5-stage pipeline: ASR → Context-Aware → Translation → Dynamic Revision → Terminology Enhancement
- **Cloud AI Powered** — Alibaba Bailian DashScope for ASR + Translation (Qwen3-8B), Xiaomi MiMo for TTS, no local GPU required; fallback route provides local model implementation (FunASR local ASR engine)
- **Real-Time Subtitles** — WebSocket streaming push, bilingual subtitles displayed in-browser in real time, with full transcript review support
- **Smart Revision** — Automatic post-translation review and correction, with custom glossary support for domain-specific terminology accuracy
- **Voice Playback** — MiMo-V2.5-TTS synthesis with 8 voice presets, hover prefetch for instant playback

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (Next.js + React)               │
│                                                          │
│   Live Translation · Subtitle History · Glossary          │
│   AI Summary · User Settings                             │
│                                                          │
└────────────────────────┬─────────────────────────────────┘
                         │ WebSocket (real-time) + REST (control)
┌────────────────────────┴─────────────────────────────────┐
│                FastAPI Backend (Python 3.10)               │
│                                                           │
│  ┌─────────┐                              ┌────────────┐ │
│  │ PyAudio │──┐                           │ Subtitle   │ │
│  │ Capture │  │    ┌──────────┐           │ Push via WS│ │
│  └─────────┘  ├──→ │ LangGraph├──┐        └────────────┘ │
│               │    │ Multi-   │  │                       │
│               │    │ Agent    │  │                       │
│               │    └──────────┘  │                       │
│  ┌──────────┐ │  ┌───────────────┘  ┌─────────────────┐ │
│  │ SQLite   │ │  │                  │                 │ │
│  │ Sessions │ └──┼──────────────────┼─────────────────│ │
│  └──────────┘    │                  │                 │ │
└──────────────────┼──────────────────┼─────────────────┘ │
                   │                  │                    
        ┌──────────┴───┐  ┌──────────┴──────┐  ┌────────┐
        │  DashScope   │  │   DashScope     │  │  MiMo  │
        │  Streaming   │  │   Qwen3-8B      │  │  TTS   │
        │  ASR         │  │   Translation   │  │        │
        └──────────────┘  └─────────────────┘  └────────┘
```

**Data Flow**: System Audio → PyAudioWPatch WASAPI Capture → DashScope Streaming ASR → LangGraph Multi-Agent Translation Pipeline (DashScope Qwen3-8B) → WebSocket Push to Browser → Real-Time Subtitle Display

## Features

| Module | Description |
|--------|-------------|
| **Live Translation** | System audio capture + streaming ASR + multi-agent translation, real-time bilingual subtitles |
| **Subtitle History** | Browse past sessions with pagination, three view modes: bilingual / Chinese-only / full transcript |
| **Glossary** | Custom terminology mapping table, automatically matched and injected during translation |
| **AI Summary** | Auto-generated session summary after translation ends |
| **Text-to-Speech** | 8 voice presets (4 Chinese + 4 English), LRU cache + hover prefetch |
| **User System** | Registration / login, usage quota management (60 min free tier) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Speech Recognition** | Alibaba Bailian DashScope Streaming ASR (`fun-asr-realtime`, WebSocket push) |
| **Translation Engine** | Alibaba Bailian DashScope Qwen3-8B (OpenAI-compatible API, streaming token output) |
| **Text-to-Speech** | Xiaomi MiMo-V2.5-TTS (PCM16@24kHz, 8 preset voices) |
| **Agent Orchestration** | LangGraph StateGraph (5-node pipeline: ASR → Context → Translation → Revision → Terminology) |
| **Audio Capture** | PyAudioWPatch + WASAPI loopback (system-level audio capture) |
| **Backend Framework** | FastAPI + WebSocket + SQLAlchemy (async) |
| **Frontend Framework** | Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4 |
| **Data Storage** | SQLite (sessions/users) + Milvus Lite (vector search) |
| **Testing** | pytest + pytest-asyncio (backend) · Vitest + Playwright (frontend) |

## Quick Start

### Prerequisites

- Python 3.10 (conda environment recommended)
- Node.js 20+
- Alibaba Bailian DashScope API Key ([apply here](https://dashscope.console.aliyun.com/))
- Xiaomi MiMo TTS API Key (optional, required for TTS playback)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/simulagent.git
cd simulagent
```

### 2. Start the Backend

```bash
conda create -n simulagent python=3.10
conda activate simulagent
cd backend
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and fill in your API keys:
#   BAILIAN_API_KEY=sk-xxx      # Bailian (ASR + Translation)
#   MIMO_API_KEY=xxx            # MiMo TTS (optional)

python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8766
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
simulagent/
├── backend/
│   └── src/
│       ├── api/               # FastAPI routes + WebSocket
│       │   ├── server.py      # App entry point
│       │   ├── ws_session.py  # WebSocket session handler
│       │   └── routes/        # REST API (auth, session, tts, glossary)
│       ├── agents/            # LangGraph multi-agent pipeline
│       │   ├── graph.py       # StateGraph definition
│       │   └── *_agent.py     # Agent nodes per stage
│       ├── asr/               # FunASR speech recognition engine
│       ├── capture/           # System audio capture (WASAPI)
│       └── models/            # SQLAlchemy data models
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router pages
│       ├── components/        # React components
│       ├── hooks/             # Custom hooks (useWebSocket, useAuth)
│       └── lib/               # Utilities (tts.ts)
└── specs/                     # Design documents
```

## License

[MIT](LICENSE)
