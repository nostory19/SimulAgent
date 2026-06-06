"""
阿里云百炼云端实时语音识别引擎（WebSocket 直连协议）。

按官方文档 WebSocket 原始协议直连，无需本地 ASR 模型。
API Key 环境变量：BAILIAN_API_KEY（兼容 DASHSCOPE_API_KEY）
"""
import asyncio
import json
import os
import uuid
import threading
import numpy as np
import websocket


class BailianRealtimeASR:
    """
    百炼实时语音识别。

    协议：header.action = run-task / finish-task
          event = task-started / result-generated / task-finished / task-failed
          audio = 二进制 PCM (16000Hz, 16bit, 单声道)

    使用：
        asr = BailianRealtimeASR(source_lang="en")
        asr.on_result = lambda text: print(text)
        asr.start()
        asr.send_audio(chunk)  # 持续推送 int16 PCM
        asr.stop()
    """

    def __init__(self, source_lang: str = "en"):
        self._source_lang = source_lang
        self._task_id = uuid.uuid4().hex[:32]
        self._task_started = False
        self._ws: websocket.WebSocketApp | None = None
        self._thread: threading.Thread | None = None
        self._running = False

        # 结果回调（外部设置）
        self.on_result = None  # async callback(text: str)

    def start(self) -> bool:
        """建立连接并发送 run-task 指令。"""
        api_key = os.environ.get("BAILIAN_API_KEY") or os.environ.get("DASHSCOPE_API_KEY", "")
        if not api_key:
            print("[BailianASR] BAILIAN_API_KEY not set")
            return False

        url = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/"
        headers = {"Authorization": f"bearer {api_key}"}

        self._task_started = False
        self._task_id = uuid.uuid4().hex[:32]

        self._ws = websocket.WebSocketApp(
            url,
            header=headers,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close,
        )
        self._thread = threading.Thread(target=self._ws.run_forever, daemon=True)
        self._thread.start()
        return True

    # ===== 协议消息 =====

    def _send_run_task(self, ws):
        """发送 run-task 启动识别任务。"""
        msg = {
            "header": {
                "action": "run-task",
                "task_id": self._task_id,
                "streaming": "duplex",
            },
            "payload": {
                "task_group": "audio",
                "task": "asr",
                "function": "recognition",
                "model": "fun-asr-realtime",
                "parameters": {
                    "sample_rate": 16000,
                    "format": "pcm",
                    "language_hints": [self._source_lang],
                },
                "input": {},
            },
        }
        ws.send(json.dumps(msg))

    def _send_finish_task(self, ws):
        msg = {
            "header": {
                "action": "finish-task",
                "task_id": self._task_id,
                "streaming": "duplex",
            },
            "payload": {"input": {}},
        }
        ws.send(json.dumps(msg))

    # ===== WebSocket 事件 =====

    def _on_open(self, ws):
        print("[BailianASR] connected, sending run-task")
        self._send_run_task(ws)

    def _on_message(self, ws, raw):
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            return

        event = msg.get("header", {}).get("event")
        payload = msg.get("payload", {})

        if event == "task-started":
            print("[BailianASR] task started")
            self._task_started = True

        elif event == "result-generated":
            text = payload.get("output", {}).get("sentence", {}).get("text", "")
            if text:
                print(f"[BailianASR] result: {text[:100]}{'...' if len(text) > 100 else ''}")
                if self.on_result:
                    self.on_result(text)
            if payload.get("usage"):
                print(f"[BailianASR] duration: {payload['usage']['duration']}s")

        elif event == "task-finished":
            print("[BailianASR] task finished")
            ws.keep_running = False

        elif event == "task-failed":
            err = msg.get("header", {}).get("error_message", "unknown")
            print(f"[BailianASR] task failed: {err}")
            ws.keep_running = False

    async def _async_emit(self, text: str):
        """异步触发结果回调。"""
        if callable(self.on_result):
            if asyncio.iscoroutinefunction(self.on_result):
                await self.on_result(text)
            else:
                self.on_result(text)

    def _on_error(self, ws, error):
        print(f"[BailianASR] error: {error}")

    def _on_close(self, ws, code, msg):
        print(f"[BailianASR] disconnected")
        self._running = False

    # ===== 音频推送 =====

    def send_audio(self, audio: np.ndarray):
        """推送 int16 PCM 音频 (16000Hz, 单声道)。"""
        if self._ws and self._task_started:
            if audio.dtype != np.int16:
                audio = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
            self._ws.send(audio.tobytes(), opcode=websocket.ABNF.OPCODE_BINARY)

    # ===== 生命周期 =====

    def is_active(self) -> bool:
        return self._task_started

    def stop(self):
        """发送 finish-task 并关闭连接。"""
        self._running = False
        if self._ws and self._task_started:
            try:
                self._send_finish_task(self._ws)
            except Exception:
                pass
            self._ws.keep_running = False
        self._ws = None
        self._task_started = False
