"""
WebSocket 会话处理器。

处理单个 WebSocket 连接的全生命周期：
1. 接收会话控制消息（start/pause/resume/stop）
2. 驱动 AudioCapture → AudioBuffer → StreamingASREngine 流水线
3. 将 asr_partial / asr_final 结果实时推送给前端
"""
import asyncio
import json
import uuid
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from ..capture.system_audio import AudioCapture
from ..asr.stream_buffer import AudioBuffer
from ..asr.funasr_engine import StreamingASREngine


async def handle_session(websocket: WebSocket):
    """
    处理一个 WebSocket 会话。

    消息协议（参考 contracts/websocket.md）：
    - start_session: 启动音频采集 + ASR 流水线
    - pause_session / resume_session: 暂停/恢复
    - stop_session: 停止会话

    推送消息：
    - asr_partial: 增量识别结果
    - asr_final: 最终识别结果
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    capture: AudioCapture | None = None
    buffer: AudioBuffer | None = None
    asr: StreamingASREngine | None = None
    running = False
    poll_task: asyncio.Task | None = None

    # 通知前端连接成功
    await websocket.send_json({"type": "connected", "session_id": session_id})

    try:
        async for raw in websocket.iter_text():
            # 解析 JSON 消息
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "code": "INVALID_JSON", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            # ===== 开始采集 =====
            if msg_type == "start_session":
                config = msg.get("config", {})
                source_lang = config.get("source_language", "en")

                # 初始化音频采集
                capture = AudioCapture()
                if not capture.start():
                    await websocket.send_json({
                        "type": "error", "code": "AUDIO_CAPTURE_FAILED",
                        "message": "Failed to start audio capture. Check audio device."
                    })
                    continue

                # 初始化音频缓冲区和 ASR 引擎
                buffer = AudioBuffer(input_rate=capture.sample_rate)
                asr = StreamingASREngine(device="cpu")

                running = True
                await websocket.send_json({
                    "type": "session_started",
                    "session": {
                        "id": session_id,
                        "source_language": source_lang,
                        "target_language": "zh",
                        "display_mode": config.get("display_mode", "bilingual"),
                        "started_at": None,
                    }
                })

                # 启动异步轮询：每隔50ms从 AudioCapture 拉取音频块
                async def poll_audio():
                    seq = 0
                    while running:
                        audio = capture.read() if capture else None
                        if audio is not None and buffer is not None:
                            buffer.feed(audio)
                            # 当缓冲区积累了足够的音频（600ms），逐个chunk送入ASR
                            while buffer.has_chunk() and asr is not None:
                                chunk = buffer.get_chunk()
                                text = asr.process_chunk(chunk, is_final=False)
                                if text:
                                    seq += 1
                                    await websocket.send_json({
                                        "type": "asr_partial",
                                        "segment_id": str(uuid.uuid4()),
                                        "sequence_number": seq,
                                        "text": text,
                                        "is_final": False,
                                        "timestamp_ms": 0,
                                    })
                        await asyncio.sleep(0.05)  # ~20 polls/sec

                poll_task = asyncio.create_task(poll_audio())

            # ===== 暂停 =====
            elif msg_type == "pause_session":
                running = False
                await websocket.send_json({"type": "session_status", "status": "paused"})

            # ===== 恢复 =====
            elif msg_type == "resume_session":
                if capture and not capture.is_running:
                    capture.start()
                running = True
                await websocket.send_json({"type": "session_status", "status": "active"})
                if poll_task is None or poll_task.done():
                    poll_task = asyncio.create_task(poll_audio())

            # ===== 停止 =====
            elif msg_type == "stop_session":
                running = False
                # flush ASR 最后缓存的结果
                if asr:
                    final = asr.finalize()
                    if final:
                        await websocket.send_json({
                            "type": "asr_final",
                            "segment_id": str(uuid.uuid4()),
                            "text": final,
                            "confidence": 1.0,
                        })
                await websocket.send_json({
                    "type": "session_ended",
                    "session_id": session_id,
                })
                break

    except WebSocketDisconnect:
        # 前端断开连接时静默退出
        pass
    finally:
        # 清理资源
        running = False
        if poll_task and not poll_task.done():
            poll_task.cancel()
        if capture:
            capture.stop()
