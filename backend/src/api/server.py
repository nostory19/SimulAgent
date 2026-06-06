"""
FastAPI 应用入口。

创建 FastAPI 实例，配置 CORS 中间件，注册 REST 路由和 WebSocket 端点。
"""
import os
from pathlib import Path
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from ..config import settings
from ..models import init_db  # 导入 models 包触发所有模型注册
from .routes.system import router as system_router
from .routes.session import router as session_router
from .ws_session import handle_session

# FastAPI 应用实例
app = FastAPI(
    title="SimulAgent",
    version="0.1.0",
    description="Real-time simultaneous interpretation backend",
)


@app.on_event("startup")
async def on_startup():
    """应用启动时初始化数据库并确保数据目录存在。"""
    # 确保 data 目录存在
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    vectors_dir = data_dir / "vectors"
    vectors_dir.mkdir(parents=True, exist_ok=True)
    # 初始化数据库表
    await init_db()

# CORS 中间件：允许前端开发服务器（localhost:3000）跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 REST 路由
app.include_router(system_router)
app.include_router(session_router)


@app.get("/api/v1/health")
async def health():
    """健康检查端点，用于确认服务是否正常运行。"""
    return {"status": "ok", "version": "0.1.0"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket 端点。

    接收前端的音频采集会话控制消息（start/pause/resume/stop），
    驱动 ASR + 翻译流水线，将识别和翻译结果实时推送回前端。
    """
    await handle_session(websocket)
