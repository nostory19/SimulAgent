"""WebSocket session handler for real-time audio capture + ASR pipeline."""
import asyncio
import json
import uuid
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from ..capture.system_audio import AudioCapture
from ..asr.stream_buffer import AudioBuffer
from ..asr.funasr_engine import StreamingASREngine


async def handle_session(websocket: WebSocket):
    """Handle a WebSocket connection for a real-time ASR session."""
    await websocket.accept()
    session_id = str(uuid.uuid4())
    capture: AudioCapture | None = None
    buffer: AudioBuffer | None = None
    asr: StreamingASREngine | None = None
    running = False
    poll_task: asyncio.Task | None = None

    await websocket.send_json({"type": "connected", "session_id": session_id})

    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "code": "INVALID_JSON", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "start_session":
                config = msg.get("config", {})
                source_lang = config.get("source_language", "en")

                # Init audio capture
                capture = AudioCapture()
                if not capture.start():
                    await websocket.send_json({
                        "type": "error", "code": "AUDIO_CAPTURE_FAILED",
                        "message": "Failed to start audio capture. Check audio device."
                    })
                    continue

                # Init audio buffer + ASR engine
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

                # Launch polling loop to read audio chunks from capture and feed to ASR
                async def poll_audio():
                    seq = 0
                    while running:
                        audio = capture.read() if capture else None
                        if audio is not None and buffer is not None:
                            buffer.feed(audio)
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

            elif msg_type == "pause_session":
                running = False
                await websocket.send_json({"type": "session_status", "status": "paused"})

            elif msg_type == "resume_session":
                if capture and not capture.is_running:
                    capture.start()
                running = True
                await websocket.send_json({"type": "session_status", "status": "active"})
                if poll_task is None or poll_task.done():
                    poll_task = asyncio.create_task(poll_audio())

            elif msg_type == "stop_session":
                running = False
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
        pass
    finally:
        running = False
        if poll_task and not poll_task.done():
            poll_task.cancel()
        if capture:
            capture.stop()
