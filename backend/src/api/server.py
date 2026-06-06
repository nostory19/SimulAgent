"""
FastAPI 应用入口。

创建 FastAPI 实例，配置 CORS 中间件，注册 REST 路由和 WebSocket 端点。
"""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from ..config import settings
from .routes.system import router as system_router
from .ws_session import handle_session

# FastAPI 应用实例
app = FastAPI(
    title="SimulAgent",
    version="0.1.0",
    description="Real-time simultaneous interpretation backend",
)

# CORS 中间件：允许前端开发服务器（localhost:3000）跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册系统工具路由（音频设备列表等）
app.include_router(system_router)


@app.get("/api/v1/health")
async def health():
    """健康检查端点，用于确认服务是否正常运行。"""
    return {"status": "ok", "version": "0.1.0"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket 端点。

    接收前端的音频采集会话控制消息（start/pause/resume/stop），
    驱动 ASR 流水线并将识别结果实时推送回前端。
    """
    await handle_session(websocket)
