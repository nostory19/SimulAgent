# Tasks: SimulAgent Platform

**Input**: Design documents from `/specs/001-simulagent-platform/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 未在 spec 中明确要求测试，本任务列表聚焦于实现任务。测试可在后续 `/speckit-implement` 时按需添加。

**Organization**: 任务按用户故事分组，每个故事可以独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（操作不同文件，无依赖关系）
- **[Story]**: 所属用户故事（US1, US2, US3, US4, US5）
- 描述中包含具体文件路径

## 路径约定

本项目的结构是 Web 应用（backend/ + frontend/），参考 plan.md 中的项目结构：
- 后端: `backend/src/`
- 前端: `frontend/src/`

---

## Phase 1: Setup（项目初始化与环境搭建）

**目标**: 创建项目骨架，安装所有依赖，确保 conda 环境可运行

- [x] T001 创建项目目录结构（backend/src/capture/, backend/src/asr/, backend/src/agents/, backend/src/models/, backend/src/api/routes/, frontend/src/components/, frontend/src/hooks/, frontend/src/services/, frontend/electron/, data/），参考 plan.md 中的 Source Code 树
- [x] T002 [P] 创建 conda 环境 `simulagent` 并安装 Python 3.10 后端核心依赖，写入 `backend/requirements.txt`（fastapi, uvicorn[standard], websockets, sqlalchemy, aiosqlite, pydantic, python-dotenv）
- [x] T003 [P] 安装 ASR 依赖，写入 `backend/requirements.txt`（funasr, onnxruntime）；安装音频采集依赖（PyAudioWPatch）
- [x] T004 [P] 安装 Agent 框架依赖，写入 `backend/requirements.txt`（langgraph, langchain, langchain-community）；安装向量库依赖（milvus-lite）
- [x] T005 [P] 安装文档解析依赖，写入 `backend/requirements.txt`（python-pptx, python-docx, pymupdf）
- [x] T006 [P] 初始化前端项目：在 `frontend/` 下创建 Next.js + TypeScript + Tailwind CSS 项目，安装依赖（next, react, react-dom, typescript, tailwindcss, electron, electron-builder）
- [x] T007 ~~安装 Ollama 并拉取翻译模型：`ollama pull qwen3:8b-q4_K_M`（主力）和 `ollama pull qwen3:4b-q8_0`（备用）~~ **SKIPPED**：改用阿里云百炼 API（OpenAI 兼容），通过 `openai` SDK + `BAILIAN_API_KEY` 环境变量调用
- [x] T008 [P] 创建 `backend/pyproject.toml` 和 `backend/.env` 配置文件模板（HOST, PORT, ASR_MODEL, ASR_DEVICE, BAILIAN_API_KEY, BAILIAN_MODEL, DATABASE_URL, MILVUS_DATA_DIR）

---

## Phase 2: Foundational（基础设施，阻塞所有用户故事）

**目标**: 搭建数据库、API 框架、WebSocket 通信、Agent 骨架，所有用户故事都依赖此阶段

**⚠️ 关键**: 此阶段必须完成，才能开始任何用户故事的实现

- [ ] T009 创建 SQLAlchemy 数据库引擎和 session 管理，在 `backend/src/models/database.py` 中实现（SQLite，自动建表）
- [ ] T010 [P] 创建 CaptureSession 数据模型，在 `backend/src/models/session.py` 中（参考 data-model.md 表1）
- [ ] T011 [P] 创建 TranscriptionSegment 数据模型，在 `backend/src/models/transcription.py` 中（参考 data-model.md 表2）
- [ ] T012 [P] 创建 TranslationEntry 数据模型，在 `backend/src/models/translation.py` 中（参考 data-model.md 表3，含 revision_history JSON 字段）
- [ ] T013 [P] 创建 TerminologyEntry 数据模型，在 `backend/src/models/terminology.py` 中（参考 data-model.md 表4）
- [ ] T014 [P] 创建 SessionSummary 数据模型，在 `backend/src/models/summary.py` 中（参考 data-model.md 表5）
- [ ] T015 FastAPI 应用初始化：在 `backend/src/api/server.py` 中创建 FastAPI app 实例，配置 CORS 中间件，注册路由，实现 `/api/v1/health` 健康检查端点（参考 contracts/api.md）
- [ ] T016 [P] WebSocket 连接管理器：在 `backend/src/api/ws_handler.py` 中实现 ConnectionManager 类（连接注册/注销、广播、单播），处理连接建立和断开
- [ ] T017 [P] 环境配置管理：在 `backend/src/config.py` 中实现基于 python-dotenv 的配置类，读取 .env 文件，提供 HOST/PORT/模型路径/数据库路径等配置项
- [ ] T018 [P] TypeScript 类型定义：在 `frontend/src/types/index.ts` 中定义与后端接口对应的 TS 类型（Session, TranscriptionSegment, TranslationEntry, WebSocket 消息类型等）

**检查点**: 基础设施就绪——可以 `uvicorn backend.src.api.server:app --reload` 启动服务器，访问 `/api/v1/health` 返回 `{"status":"ok"}`，WebSocket 可以连接

---

## Phase 3: User Story 1 - 实时音频采集与语音识别 (Priority: P1) 🎯 MVP

**目标**: 用户打开 SimulAgent，系统自动采集系统音频，实时显示英文/中文语音识别文本

**独立测试**: 播放任意英文音频（YouTube 视频、会议、录音），验证屏幕上出现增量更新的转写文本，延迟低于 3 秒

### US1 实现任务

- [ ] T019 [P] [US1] WASAPI 音频采集器：在 `backend/src/capture/system_audio.py` 中实现 AudioCapture 类，使用 PyAudioWPatch + WASAPI loopback 采集系统音频（float32, 48000Hz, 2ch），callback 模式推入 ring buffer
- [ ] T020 [P] [US1] 音频设备管理器：在 `backend/src/capture/device_manager.py` 中实现设备枚举函数 `get_default_wasapi_loopback()` 和 `list_audio_devices()`
- [ ] T021 [US1] 音频流缓冲区：在 `backend/src/asr/stream_buffer.py` 中实现 AudioBuffer 类（ring buffer，支持重采样 48000→16000Hz，立体声→单声道），供 ASR 引擎消费
- [ ] T022 [US1] FunASR 流式引擎封装：在 `backend/src/asr/funasr_engine.py` 中实现 StreamingASREngine 类，加载 `paraformer-zh-streaming` 模型，封装 chunk 级 `generate()` 调用（含 cache 状态管理、is_final 刷新），返回增量文本
- [ ] T023 [US1] 在 WebSocket handler 中实现 audio_chunk 消息处理：接收前端发送的二进制音频帧，写入 AudioBuffer，驱动 ASR 引擎，通过 WebSocket 向前端推送 `asr_partial` 和 `asr_final` 消息（参考 contracts/websocket.md）
- [ ] T024 [US1] API 路由——音频设备列表：在 `backend/src/api/routes/system.py` 中实现 `GET /api/v1/system/audio-devices` 端点
- [ ] T025 [US1] 前端音频采集 Hook：在 `frontend/src/hooks/useAudioCapture.ts` 中实现 useAudioCapture hook，通过 Electron IPC 或直接调用后端 WebSocket 发送音频数据，管理采集状态（idle/capturing/paused/error）
- [ ] T026 [US1] 前端 WebSocket Hook：在 `frontend/src/hooks/useWebSocket.ts` 中实现 useWebSocket hook，管理 WebSocket 连接生命周期（自动连接、断线重连、消息解析），dispatch asr_partial/asr_final 事件
- [ ] T027 [US1] 前端控制面板组件：在 `frontend/src/components/ControlPanel.tsx` 中实现会话控制面板（开始/暂停/停止按钮、源语言选择、状态指示器），调用 useWebSocket 和 useAudioCapture
- [ ] T028 [US1] Electron 主进程：在 `frontend/electron/main.ts` 中创建 Electron BrowserWindow（Next.js 渲染），配置 alwaysOnTop/frame/transparent；在 `frontend/electron/preload.ts` 中暴露音频采集相关 IPC 接口

**检查点**: US1 可独立验证——启动 Electron 应用，播放英文视频，控制面板显示实时转写文本，WebSocket 消息符合 contracts/websocket.md 中的 asr_partial/asr_final 格式

---

## Phase 4: User Story 2 - 实时翻译与字幕展示 (Priority: P1) 🎯 MVP

**目标**: 系统将识别到的英文文本实时翻译为中文，以浮动字幕窗口形式展示。用户可切换中文/双语模式

**独立测试**: 播放英文音频，验证中文字幕以浮动窗口形式出现，翻译准确，可在中文/双语模式间切换

### US2 实现任务

- [ ] T029 [P] [US2] ASR Agent 节点：在 `backend/src/agents/asr_agent.py` 中实现 LangGraph agent node，封装 StreamingASREngine 调用，使用 `get_stream_writer()` 发送 asr:chunk 自定义事件
- [ ] T030 [P] [US2] Context Agent 节点：在 `backend/src/agents/context_agent.py` 中实现上下文窗口管理，维护最近 3-5 条翻译对，为主题跟踪提供上下文拼接
- [ ] T031 [US2] Translation Agent 节点：在 `backend/src/agents/translation_agent.py` 中实现翻译 agent，调用 Ollama API（qwen3:8b-q4_K_M），使用 research.md 中定义的 prompt 模板，`stream: true` 逐 token 输出
- [ ] T032 [US2] LangGraph 图定义：在 `backend/src/agents/graph.py` 中组装最小流水线 StateGraph（START → ASR → Context → Translation → END），实现 PipelineState TypedDict，配置 `astream()` 消费
- [ ] T033 [US2] Agent 流水线集成 WebSocket：在 `backend/src/api/ws_handler.py` 中实现 `start_session` 消息处理，启动 LangGraph 图执行，消费 astream 事件并推送 translation_token、translation_complete、subtitle_entry 到前端
- [ ] T034 [US2] Session CRUD API 路由：在 `backend/src/api/routes/session.py` 中实现 `POST/GET /api/v1/sessions`、`GET/DELETE /api/v1/sessions/{id}` 和 `GET /api/v1/sessions/{id}/subtitles` 端点（参考 contracts/api.md）
- [ ] T035 [P] [US2] 前端字幕窗口组件：在 `frontend/src/components/SubtitleWindow.tsx` 中实现浮动字幕窗口（半透明背景、可调节字体大小/颜色/位置、自动滚动、历史回看），渲染双语或中文模式
- [ ] T036 [P] [US2] 前端设置面板组件：在 `frontend/src/components/SettingsPanel.tsx` 中实现设置面板（字幕模式切换、字体大小、窗口透明度、位置调节）
- [ ] T037 [US2] 前端翻译 token 增量渲染：在 `frontend/src/hooks/useWebSocket.ts` 中处理 translation_token 消息，支持逐 token 累积显示（字幕逐词出现的效果）
- [ ] T038 [US2] 前端会话历史组件：在 `frontend/src/components/SessionHistory.tsx` 中实现历史会话列表，调用 sessions API，支持查看和删除

**检查点**: US1+US2 可联合验证——播放英文视频，浮动字幕窗口实时显示中文翻译，支撑 MVP 交付

---

## Phase 5: User Story 3 - 上下文感知动态修正 (Priority: P2)

**目标**: 当后续语音提供更多上下文后，系统自动检测并修正在此之前翻译不准确的字幕，高亮显示修改

**独立测试**: 播放含歧义术语（如先说 "graph model" 后说 "graph foundation model"）的音频，验证早先字幕被自动更新并高亮标记

### US3 实现任务

- [ ] T039 [US3] Revision Agent 节点：在 `backend/src/agents/revision_agent.py` 中实现 revision agent，对比上下文窗口变化，检测需要修正的翻译条目，调用 Ollama 重新生成修正后的翻译
- [ ] T040 [US3] 修正触发逻辑：在 `backend/src/agents/graph.py` 中更新 StateGraph，添加 Revision 节点和条件边 `route_revision()`——当检测到上下文变化时跳转回 Translation 节点重新翻译，否则继续前进（最多 3 次循环）
- [ ] T041 [US3] TranslationEntry 修正历史记录：在 `backend/src/models/translation.py` 中实现 revision_history JSON 字段的读写方法，每次修正时追加 `{timestamp, old_text, new_text, reason}`
- [ ] T042 [US3] WebSocket revision 消息推送：在 `backend/src/api/ws_handler.py` 中实现 revision 事件推送（`{"type":"revision","entry_id":"...","old_translation":"...","new_translation":"..."}`），参考 contracts/websocket.md
- [ ] T043 [US3] 前端修正高亮显示：在 `frontend/src/components/SubtitleWindow.tsx` 中处理 revision 消息，对修正后的字幕添加闪烁/颜色变化动画（CSS transition），历史中同时显示原文和修正文

**检查点**: US3 可独立验证——播放含歧义术语的音频，观察字幕被自动修正并高亮

---

## Phase 6: User Story 4 - 专业术语增强 (Priority: P3)

**目标**: 用户上传参考文档（PDF/PPT/Word），系统提取专业术语构建知识库，翻译时优先使用标准译法

**独立测试**: 上传一篇含 "attention mechanism"、"backpropagation" 等术语的 ML 论文，播放含这些术语的音频，验证翻译使用论文中的标准中文译法

### US4 实现任务

- [ ] T044 [P] [US4] 文档解析服务：在 `backend/src/services/document_parser.py` 中实现 DocumentParser 类，支持 PDF（PyMuPDF）、PPTX（python-pptx）、DOCX（python-docx）、TXT 格式的文本提取
- [ ] T045 [P] [US4] 术语提取服务：在 `backend/src/services/term_extractor.py` 中实现 TermExtractor 类，使用 Ollama + 专用 prompt 从文档文本中提取 `{source_term, standard_translation, domain}` 元组
- [ ] T046 [US4] Terminology Agent 节点：在 `backend/src/agents/terminology_agent.py` 中实现术语增强 agent，查询 Milvus Lite 向量库（对当前 ASR 文本做 embedding 相似度检索），将匹配到的术语注入 Translation Agent 的 prompt
- [ ] T047 [US4] Milvus Lite 向量存储初始化：在 `backend/src/models/terminology.py` 中实现 `init_milvus()` 函数，创建 collection（1024 维向量，metric=COSINE），实现 `insert_terms()` 和 `search_terms()` 方法
- [ ] T048 [US4] 在 LangGraph 图中集成 Terminology Agent：更新 `backend/src/agents/graph.py`，在 Translation → Revision 路径中插入 Terminology 节点，通过 Runtime context 传入 term_cache
- [ ] T049 [US4] 文档上传 API 路由：在 `backend/src/api/routes/upload.py` 中实现 `POST /api/v1/sessions/{id}/documents`（multipart 上传）、`GET /api/v1/sessions/{id}/terminology`（术语列表）、`DELETE /api/v1/sessions/{id}/documents/{doc_id}` 端点（参考 contracts/api.md）
- [ ] T050 [US4] 前端文件上传组件：在 `frontend/src/components/FileUpload.tsx` 中实现拖拽/点击上传区域，支持多文件，显示解析进度和提取结果（术语数量）
- [ ] T051 [US4] TranslationEntry 术语标记：在 `backend/src/models/translation.py` 中更新 translation 创建逻辑，记录 `terminology_applied` JSON 字段（哪些术语被应用及来源文档）

**检查点**: US4 可独立验证——上传术语文档后，翻译输出使用标准专业译法

---

## Phase 7: User Story 5 - AI 会议总结 (Priority: P3)

**目标**: 会话结束后，用户请求生成包含摘要、核心观点、术语表和行动项的 AI 总结

**独立测试**: 完成一个 5 分钟以上的转录会话，触发总结生成，验证输出包含摘要/观点/术语/行动项四个部分且内容基于真实转录

### US5 实现任务

- [ ] T052 [US5] Summary Agent 节点：在 `backend/src/agents/summary_agent.py` 中实现总结 agent，聚合整个会话的 TranscriptionSegment 数据，调用 Ollama 生成结构化总结（摘要、核心观点、术语表、行动项），写入 SessionSummary 表
- [ ] T053 [US5] SessionSummary 数据模型完善：在 `backend/src/models/summary.py` 中实现 CRUD 方法和 JSON 序列化（key_viewpoints, term_glossary, action_items）
- [ ] T054 [US5] 总结生成 API 路由：在 `backend/src/api/routes/summary.py` 中实现 `POST /api/v1/sessions/{id}/summary`（触发生成）和 `GET /api/v1/sessions/{id}/summary`（查询已有）端点（参考 contracts/api.md）
- [ ] T055 [US5] WebSocket summary_ready 消息：在总结生成完成后通过 WebSocket 推送 `summary_ready` 消息（如果会话仍在 WebSocket 连接状态）
- [ ] T056 [US5] 前端总结展示组件：在 `frontend/src/components/SummaryView.tsx` 中实现总结展示面板（可折叠的摘要/核心观点/术语表/行动项卡片，支持复制和导出）
- [ ] T057 [US5] 会话结束后自动提示：在 `frontend/src/components/ControlPanel.tsx` 中添加 "生成总结" 按钮（会话结束后可用），点击触发总结生成 API

**检查点**: US5 可独立验证——结束一个会话后，点击生成总结，查看结构化总结内容真实准确

---

## Phase 8: Polish & 跨功能优化

**目标**: 整体打磨、性能优化、文档完善

- [ ] T058 [P] 前端应用布局和路由：在 `frontend/src/app/layout.tsx` 和 `frontend/src/app/page.tsx` 中实现主界面布局（左侧控制面板 + 右侧字幕预览），整合所有组件
- [ ] T059 [P] 音频采集重连和容错：在 `backend/src/capture/system_audio.py` 中添加设备断线检测和自动重连逻辑
- [ ] T060 [P] LLM 模型自动降级：在 `backend/src/agents/translation_agent.py` 中实现超时/错误时从 qwen3:8b 降级到 qwen3:4b 的 fallback 机制
- [ ] T061 [P] 长时间会话内存管理：在 `backend/src/asr/stream_buffer.py` 和 `backend/src/agents/context_agent.py` 中添加内存限制（字幕历史分页、旧上下文淘汰）
- [ ] T062 [P] Electron 打包配置：在 `frontend/electron/main.ts` 和 `package.json` 中配置 electron-builder，生成 Windows .exe 安装包
- [ ] T063 按 `quickstart.md` 进行端到端验证：在全新的 conda 环境中完成安装→启动→采集→翻译→展示的完整流程验证

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始
- **Foundational (Phase 2)**: 依赖 Phase 1 完成 —— **阻塞所有用户故事**
- **User Story 1 (Phase 3)**: 依赖 Phase 2 完成
- **User Story 2 (Phase 4)**: 依赖 Phase 2 完成 + US1（需要 ASR 输出作为翻译输入）
- **User Story 3 (Phase 5)**: 依赖 US2 完成（需要 Translation Agent 和上下文窗口就绪）
- **User Story 4 (Phase 6)**: 依赖 US2 完成（需要翻译流水线就绪）；可与 US3 并行
- **User Story 5 (Phase 7)**: 依赖 US1 完成（需要 TranscriptionSegment 数据）；可与 US3/US4 并行
- **Polish (Phase 8)**: 依赖所有用户故事完成

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
Phase 3: US1 (Audio Capture + ASR)
    ↓
Phase 4: US2 (Translation + Subtitle)
    ↓
┌───────────────┬───────────────────┐
    ↓                ↓                   ↓
Phase 5: US3    Phase 6: US4        Phase 7: US5
(Dynamic Rev.)  (Terminology)       (Summary)
    ↓                ↓                   ↓
┌───────────────┴───────────────────┘
    ↓
Phase 8: Polish
```

- **US1 (P1)**: Phase 2 完成后可开始——不依赖其他故事
- **US2 (P1)**: Phase 2 + US1 完成后可开始——依赖 ASR 输出
- **US3 (P2)**: Phase 2 + US2 完成后可开始——依赖翻译流水线
- **US4 (P3)**: Phase 2 + US2 完成后可开始——依赖翻译流水线；可与 US3 并行
- **US5 (P3)**: Phase 2 + US1 完成后可开始——依赖转录数据；可与 US3/US4 并行

### Within Each User Story

- 数据模型相关任务优先
- 后端服务/Agent 次之
- API/WebSocket 集成再次之
- 前端组件最后
- 标记 [P] 的任务可并行

### Parallel Opportunities

- Phase 1 中 T002-T006 全部可并行（不同文件/不同环境）
- Phase 2 中 T010-T014 全部可并行（5 个独立模型文件）
- Phase 3 中 T019 和 T020 可并行
- Phase 4 中 T029 和 T030 可并行；T035 和 T036 可并行
- Phase 5 和 Phase 6 和 Phase 7 可以并行（如果有多人开发）
- Phase 8 中 T058-T062 全部可并行

---

## Parallel Example: Phase 2 Foundational

```bash
# 并行启动所有数据模型任务（互不依赖，不同文件）:
Task: "T010 创建 CaptureSession 数据模型 backend/src/models/session.py"
Task: "T011 创建 TranscriptionSegment 数据模型 backend/src/models/transcription.py"
Task: "T012 创建 TranslationEntry 数据模型 backend/src/models/translation.py"
Task: "T013 创建 TerminologyEntry 数据模型 backend/src/models/terminology.py"
Task: "T014 创建 SessionSummary 数据模型 backend/src/models/summary.py"
```

## Parallel Example: User Story 2

```bash
# 并行启动 US2 的 Agent 节点（不同文件）:
Task: "T029 [US2] ASR Agent 节点 backend/src/agents/asr_agent.py"
Task: "T030 [US2] Context Agent 节点 backend/src/agents/context_agent.py"

# 并行启动 US2 的前端组件（不同文件）:
Task: "T035 [US2] 字幕窗口组件 frontend/src/components/SubtitleWindow.tsx"
Task: "T036 [US2] 设置面板组件 frontend/src/components/SettingsPanel.tsx"
```

---

## Implementation Strategy

### MVP 优先（仅 US1 + US2）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键——阻塞所有故事）
3. 完成 Phase 3: US1 音频采集与语音识别
4. 完成 Phase 4: US2 实时翻译与字幕展示
5. **停下来验证**: 独立测试 US1+US2——能用浮动字幕看 YouTube 视频的实时中文翻译
6. 这就是可交付的 MVP！

### 增量交付

1. Setup + Foundational → 基础设施就绪
2. +US1 → 实时转写可用（独立可测）
3. +US2 → 实时翻译字幕（MVP！可演示/交付）
4. +US3 → 动态修正（翻译质量提升）
5. +US4 → 术语增强（专业场景可用）
6. +US5 → AI 总结（知识沉淀完整）
7. +Polish → 生产就绪

### 多人协作策略

如果有多个开发者：

1. 团队共同完成 Setup + Foundational
2. Foundational 完成后：
   - 开发者 A: US1 → US2（核心流水线必须串行）
   - 在 US2 完成后可拆分：
     - 开发者 A: US3 动态修正
     - 开发者 B: US4 术语增强
     - 开发者 C: US5 会议总结
3. 各故事独立完成和集成

---

## Notes

- [P] 任务 = 不同文件，无依赖关系，可并行
- [Story] 标签将任务映射到具体用户故事，便于追踪
- 每个用户故事应可独立完成和测试
- 每个任务或逻辑组完成后提交
- 在任何检查点停下来独立验证故事
- 避免：模糊任务、同文件冲突、打破独立性的跨故事依赖
