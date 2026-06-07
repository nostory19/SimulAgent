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
  <p><b>多智能体协同的实时同声传译助手</b></p>
  <p>融合 LangGraph 多 Agent 流水线与流式语音识别，让跨语言沟通零延迟</p>
</div>

<p align="center">
  系统音频采集 · 流式语音识别 · 多智能体翻译 · 动态字幕修正 · 术语增强 · 语音合成回放
</p>

<p align="center">
  <a href="#-核心亮点">核心亮点</a> ·
  <a href="#-系统架构">系统架构</a> ·
  <a href="#-功能模块">功能模块</a> ·
  <a href="#-技术栈">技术栈</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-项目结构">项目结构</a> ·
  <a href="#-开发流程">开发流程</a>
</p>

---

## 核心亮点

- **零延迟同传** — 系统级音频捕获 + DashScope 流式 ASR，音频到字幕延迟 ≤3s，流式部分结果每 200-500ms 刷新
- **多智能体协同** — LangGraph StateGraph 编排 ASR → 上下文感知 → 翻译 → 动态修正 → 术语增强 五阶段流水线
- **云端 AI 驱动** — 阿里百炼 DashScope 提供 ASR + 翻译（Qwen3-8B），小米 MiMo 提供语音合成，开箱即用无需本地 GPU；备份路线提供本地模型实现（FunASR 本地 ASR 引擎）
- **实时字幕** — WebSocket 流式推送，浏览器实时展示中英双语字幕，支持全量译文回顾
- **智能修正** — 翻译结果自动回顾修正，支持术语库自定义，确保专业术语准确
- **语音回放** — MiMo-V2.5-TTS 语音合成，支持 8 种音色，悬停预取秒级播放

## 系统架构

```
┌──────────────────────────────────────────────────────────┐
│                   浏览器 (Next.js + React)                │
│                                                          │
│   实时翻译 · 字幕记录 · 术语库 · AI 总结 · 用户设置        │
│                                                          │
└────────────────────────┬─────────────────────────────────┘
                         │ WebSocket (实时流) + REST (控制)
┌────────────────────────┴─────────────────────────────────┐
│                FastAPI 后端 (Python 3.10)                  │
│                                                           │
│  ┌─────────┐                              ┌────────────┐ │
│  │ PyAudio │──┐                           │  字幕推送   │ │
│  │ 音频采集 │  │    ┌──────────┐           │  via WS    │ │
│  └─────────┘  ├──→ │ LangGraph├──┐        └────────────┘ │
│               │    │ 多Agent  │  │                       │
│               │    └──────────┘  │                       │
│               │                  │                       │
│  ┌──────────┐ │  ┌───────────────┘  ┌─────────────────┐ │
│  │ SQLite   │ │  │                  │                 │ │
│  │ 会话/用户│ └──┼──────────────────┼─────────────────│ │
│  └──────────┘    │                  │                 │ │
└──────────────────┼──────────────────┼─────────────────┘ │
                   │                  │                    
        ┌──────────┴───┐  ┌──────────┴──────┐  ┌────────┐
        │  DashScope   │  │   DashScope     │  │  MiMo  │
        │  ASR 流式识别 │  │   Qwen3-8B 翻译 │  │  TTS   │
        │  (百炼)       │  │   (百炼)         │  │  语音  │
        └──────────────┘  └─────────────────┘  └────────┘
```

**数据流**：系统音频 → PyAudioWPatch WASAPI 采集 → DashScope 流式 ASR → LangGraph 多智能体翻译流水线（DashScope Qwen3-8B）→ WebSocket 推送浏览器 → 实时字幕展示

## 功能模块

| 模块 | 说明 |
|------|------|
| **实时翻译** | 系统音频采集 + 流式 ASR + 多智能体翻译，实时中英双语字幕 |
| **字幕记录** | 历史会话浏览，支持分页、中英双语/仅中文/全量译文三种视图 |
| **术语库** | 自定义专业术语对照表，翻译时自动匹配增强 |
| **AI 总结** | 会话结束后自动生成摘要总结 |
| **语音合成** | 8 种音色（中文 4 种 + 英文 4 种），缓存 + 悬停预取 |
| **用户系统** | 注册/登录，使用额度管理（免费 60 分钟） |

## 技术栈

| 层级 | 技术 |
|------|------|
| **语音识别** | 阿里百炼 DashScope 流式 ASR（`fun-asr-realtime`，WebSocket 推流） |
| **翻译引擎** | 阿里百炼 DashScope Qwen3-8B（OpenAI 兼容接口，流式 token 输出） |
| **语音合成** | 小米 MiMo-V2.5-TTS（PCM16@24kHz，8 种预置音色） |
| **Agent 编排** | LangGraph StateGraph（5 节点流水线：ASR → 上下文 → 翻译 → 修正 → 术语） |
| **音频采集** | PyAudioWPatch + WASAPI loopback（系统级音频捕获） |
| **后端框架** | FastAPI + WebSocket + SQLAlchemy（异步） |
| **前端框架** | Next.js 16 + React 19 + TypeScript 6 + Tailwind CSS 4 |
| **数据存储** | SQLite（会话/用户） + Milvus Lite（向量检索） |
| **测试** | pytest + pytest-asyncio（后端） · Vitest + Playwright（前端） |

## 快速开始

### 环境要求

- Python 3.10（推荐 conda 环境）
- Node.js 20+
- 阿里百炼 DashScope API Key（[申请地址](https://dashscope.console.aliyun.com/)）
- 小米 MiMo TTS API Key（可选，语音合成功能需要）

### 1. 克隆项目

```bash
git clone https://github.com/your-username/simulagent.git
cd simulagent
```

### 2. 后端启动

```bash
conda create -n simulagent python=3.10
conda activate simulagent
cd backend
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Key：
#   BAILIAN_API_KEY=sk-xxx      # 百炼（ASR + 翻译）
#   MIMO_API_KEY=xxx            # MiMo TTS（可选）

python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8766
```

### 3. 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
simulagent/
├── backend/
│   └── src/
│       ├── api/               # FastAPI 路由 + WebSocket
│       │   ├── server.py      # 应用入口
│       │   ├── ws_session.py  # WebSocket 会话管理
│       │   └── routes/        # REST API (auth, session, tts, glossary)
│       ├── agents/            # LangGraph 多智能体流水线
│       │   ├── graph.py       # StateGraph 定义
│       │   └── *_agent.py     # 各阶段 Agent 节点
│       ├── asr/               # FunASR 语音识别引擎
│       ├── capture/           # 系统音频采集 (WASAPI)
│       └── models/            # SQLAlchemy 数据模型
├── frontend/
│   └── src/
│       ├── app/               # Next.js App Router 页面
│       ├── components/        # React 组件
│       ├── hooks/             # 自定义 Hooks (useWebSocket, useAuth)
│       └── lib/               # 工具库 (tts.ts)
└── specs/                     # 设计文档
```

## 开发流程

本项目使用 [Speckit](https://github.com/anthropics/speckit) 驱动的规范优先开发流程（Spec-Driven Development）。在编写任何代码之前，先通过结构化的设计文档完成需求分析、技术调研和架构设计，确保实现有据可依。

### Speckit 产出物

| 文档 | 阶段 | 说明 |
|------|------|------|
| `spec.md` | 需求定义 | 功能规范，用户故事，验收标准 |
| `research.md` | 技术调研 | 方案对比，技术选型依据 |
| `data-model.md` | 架构设计 | 数据模型，实体关系 |
| `plan.md` | 实施计划 | 分阶段任务拆解，文件清单 |
| `contracts/` | 接口契约 | WebSocket 消息协议，REST API 规范 |
| `tasks.md` | 任务跟踪 | 开发任务清单与进度 |
| `quickstart.md` | 快速上手 | 环境配置与启动指南 |

### 流程

```
需求定义 (spec.md)
    ↓
技术调研 (research.md)  →  数据模型设计 (data-model.md)
    ↓
实施计划 (plan.md)  →  接口契约 (contracts/)
    ↓
编码实现  →  任务跟踪 (tasks.md)
```

## License

[MIT](LICENSE)
