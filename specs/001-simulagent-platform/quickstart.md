# Quickstart Guide: SimulAgent Platform

**Target**: Developers setting up the SimulAgent development environment
**Prerequisites**: Windows 11, conda, Git, Node.js 18+

## 1. Environment Setup

### Conda Environment

```bash
# Create and activate the conda environment
conda create -n simulagent python=3.10 -y
conda activate simulagent
```

### Backend Dependencies

```bash
# Audio capture (Windows WASAPI loopback)
pip install PyAudioWPatch

# ASR
pip install funasr
# Optional: for ONNX runtime acceleration
pip install onnxruntime

# LLM serving
# Install Ollama from: https://ollama.com/download/windows
ollama pull qwen3:8b-q4_K_M   # Primary model
ollama pull qwen3:4b-q8_0     # Fallback for lower-spec machines

# Web framework + async
pip install fastapi uvicorn[standard] websockets

# Agent framework
pip install langgraph langchain langchain-community

# Vector DB (embedded mode)
pip install milvus-lite

# Database
pip install sqlalchemy aiosqlite

# Document parsing
pip install python-pptx python-docx pymupdf  # PDF via PyMuPDF

# Testing
pip install pytest pytest-asyncio
```

### Frontend Dependencies

```bash
# Install Node.js 18+ from: https://nodejs.org/
cd frontend
npm install

# Key packages (installed via package.json)
# next react react-dom typescript tailwindcss
# electron electron-builder
```

### Verify Installation

```bash
conda activate simulagent

# Check Python packages
python -c "import pyaudiowpatch; print('Audio capture: OK')"
python -c "from funasr import AutoModel; print('FunASR: OK')"
python -c "import ollama; print('Ollama: OK')"
python -c "import langgraph; print('LangGraph: OK')"

# Check Ollama model
ollama list | grep qwen3

# Check Node.js
node --version  # Should be 18+
```

## 2. Project Structure After Setup

```
simulagent/
├── backend/
│   ├── src/
│   │   ├── capture/       # WASAPI loopback audio capture
│   │   ├── asr/           # FunASR streaming integration
│   │   ├── agents/        # LangGraph multi-agent pipeline
│   │   ├── models/        # SQLAlchemy data models
│   │   └── api/           # FastAPI WebSocket & REST
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/    # React UI components
│   │   ├── hooks/         # WebSocket, audio capture hooks
│   │   ├── services/      # API client
│   │   └── app/           # Next.js app
│   ├── electron/          # Electron main process
│   └── package.json
├── data/                  # Local storage (gitignored)
│   ├── simulagent.db      # SQLite database
│   └── vectors/           # Milvus Lite vector store
└── specs/                 # Design documents
```

## 3. Running the Application

### Start Backend Server

```bash
conda activate simulagent
cd backend
uvicorn src.api.server:app --host 127.0.0.1 --port 8765 --reload
```

The backend starts on `http://localhost:8765` with:
- WebSocket at `ws://localhost:8765/ws`
- REST API at `http://localhost:8765/api/v1`
- Health check at `http://localhost:8765/api/v1/health`

### Start Frontend (Development)

```bash
cd frontend
npm run dev          # Next.js dev server on localhost:3000
```

### Start as Desktop App (Electron)

```bash
cd frontend
npm run electron:dev  # Electron + Next.js together
```

## 4. How It Works on a Video Website

The key design insight: **SimulAgent captures audio at the OS level, not from the browser.**

1. **User plays a video** on YouTube/Bilibili/Coursera in any browser
2. **Audio goes to speakers** via the Windows audio engine
3. **WASAPI loopback captures** all speaker output as a virtual input device
4. **SimulAgent processes** the audio stream: capture → ASR → translate → display
5. **Floating subtitle window** (Electron, always-on-top) overlays the screen with translated subtitles
6. **Zero integration needed** with the video website — works with any audio source

```
┌──────────────────────────────────────┐
│  Chrome: YouTube video playing       │
│  ┌────────────────────────────────┐  │
│  │     [Video Content]            │  │
│  │                                │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  SimulAgent Floating Subtitle Window │
│  ┌────────────────────────────────┐  │
│  │ 图基础模型实现了跨领域的...      │  │ ← always on top
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
        ↑
        │ WASAPI loopback captures speaker audio
        │
  ┌─────┴──────┐
  │ SimulAgent │ (local backend process)
  │  Backend   │
  └────────────┘
```

## 5. Development Workflow

### Running Tests

```bash
# Backend unit tests
cd backend
pytest tests/unit/ -v

# Backend integration tests
pytest tests/integration/ -v

# Frontend tests
cd frontend
npm test
```

### Key Configuration

The backend uses `backend/.env` (create from example):
```
# Server
HOST=127.0.0.1
PORT=8765

# ASR
ASR_MODEL=paraformer-zh-streaming
ASR_DEVICE=cpu          # or cuda

# LLM
OLLAMA_HOST=http://localhost:11434
LLM_MODEL=qwen3:8b-q4_K_M
LLM_FALLBACK=qwen3:4b-q8_0

# Storage
DATABASE_URL=sqlite:///../data/simulagent.db
MILVUS_DATA_DIR=../data/vectors
```

### Common Issues

| Problem | Solution |
|---------|----------|
| No audio captured | Check system volume is not muted; use `get_default_wasapi_loopback()` for device selection |
| ASR model download slow | Models download from ModelScope on first `AutoModel()` call; use mirror if needed |
| Ollama connection refused | Ensure Ollama is running: `ollama serve` |
| CUDA out of memory | Switch to `qwen3:4b-q8_0` or use CPU: `ASR_DEVICE=cpu` |
| Subtitle window not visible | Check Electron window position; it may be off-screen on multi-monitor setups |
