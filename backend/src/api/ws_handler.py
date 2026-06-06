"""WebSocket connection manager."""
import json
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting."""

    def __init__(self):
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self._connections.pop(session_id, None)

    async def send(self, session_id: str, message: dict):
        ws = self._connections.get(session_id)
        if ws:
            await ws.send_json(message)

    async def send_error(self, session_id: str, code: str, message: str, recoverable: bool = False):
        await self.send(session_id, {
            "type": "error",
            "code": code,
            "message": message,
            "recoverable": recoverable,
        })

    async def broadcast(self, message: dict):
        for ws in self._connections.values():
            await ws.send_json(message)

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
