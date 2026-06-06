"""
WebSocket 连接管理器。

维护活跃的 WebSocket 连接字典，提供按 session_id 的单播、
全局广播和错误消息发送功能。
"""
from fastapi import WebSocket


class ConnectionManager:
    """
    WebSocket 连接管理器。

    功能：
    - connect/disconnect: 注册和注销连接
    - send: 向指定 session 发送消息
    - broadcast: 向所有连接的 session 发送消息
    """

    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        """注册一个新的 WebSocket 连接。"""
        await websocket.accept()
        self._connections[session_id] = websocket

    def disconnect(self, session_id: str):
        """注销一个 WebSocket 连接。"""
        self._connections.pop(session_id, None)

    async def send(self, session_id: str, message: dict):
        """向指定 session 发送 JSON 消息。"""
        ws = self._connections.get(session_id)
        if ws:
            await ws.send_json(message)

    async def send_error(self, session_id: str, code: str, message: str, recoverable: bool = False):
        """向指定 session 发送结构化错误消息。"""
        await self.send(session_id, {
            "type": "error",
            "code": code,
            "message": message,
            "recoverable": recoverable,
        })

    async def broadcast(self, message: dict):
        """向所有已连接的 session 广播消息。"""
        for ws in self._connections.values():
            await ws.send_json(message)

    @property
    def active_count(self) -> int:
        """当前活跃连接数。"""
        return len(self._connections)


# 全局单例连接管理器
manager = ConnectionManager()
