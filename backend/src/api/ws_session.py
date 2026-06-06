"""
WebSocket 会话处理器。

处理单个 WebSocket 连接的全生命周期：
1. 接收会话控制消息（start/pause/resume/stop）
2. 驱动 AudioCapture → AudioBuffer → ASR → 百炼翻译流水线
3. 将识别和翻译结果实时推送给前端
"""
import asyncio
import json
import os
import uuid
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI
from ..capture.system_audio import AudioCapture
from ..asr.stream_buffer import AudioBuffer
from ..asr.funasr_engine import get_asr_engine

TRANSLATION_PROMPT = """You are a professional simultaneous interpreter translating from English to Simplified Chinese.
Rules:
- Produce only the Chinese translation. Do not add explanations, notes, or the original English.
- Use natural, fluent Chinese that sounds like a native speaker.
- Preserve proper nouns, product names, and technical acronyms in their original form.
- Keep the translation concise."""


def _get_translation_client():
    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


async def _translate_text(text: str) -> str:
    """调用百炼 API 翻译一段文本（非流式）。"""
    if not text.strip():
        return text
    client = _get_translation_client()
    model_name = os.getenv("BAILIAN_MODEL", "qwen3-8b")
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": TRANSLATION_PROMPT},
                {"role": "user", "content": f"Translate: {text}"},
            ],
            temperature=0.3,
            max_tokens=500,
            extra_body={"enable_thinking": False},
        )
        translated = response.choices[0].message.content
        return translated.strip() if translated else text
    except Exception as e:
        print(f"[translate] error: {e}")
        return text


async def handle_session(websocket: WebSocket):
    """处理一个 WebSocket 会话。"""
    await websocket.accept()
    session_id = str(uuid.uuid4())
    capture: AudioCapture | None = None
    buffer: AudioBuffer | None = None
    running = False
    poll_task: asyncio.Task | None = None
    segment_sequence = 0

    await websocket.send_json({"type": "connected", "session_id": session_id})
    print(f"[ws] session={session_id[:8]} connected")

    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            # ===== 开始采集 =====
            if msg_type == "start_session":
                config = msg.get("config", {})
                source_lang = config.get("source_language", "en")

                # 启动 WASAPI loopback 音频采集
                capture = AudioCapture()
                if not capture.start():
                    await websocket.send_json({
                        "type": "error", "code": "AUDIO_CAPTURE_FAILED",
                        "message": "无法启动音频采集，请检查音频设备"
                    })
                    continue

                # 初始化音频缓冲区和 ASR 引擎
                buffer = AudioBuffer(input_rate=capture.sample_rate)
                asr = get_asr_engine(device="cpu")
                running = True
                segment_sequence = 0

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
                print(f"[ws] capture started, device={capture.sample_rate}Hz")

                async def poll_audio_and_translate():
                    """异步轮询：采集音频 → ASR → 翻译 → 推送前端。"""
                    nonlocal segment_sequence
                    pending_text = ""

                    while running:
                        try:
                            audio = capture.read() if capture else None
                            if audio is not None and buffer is not None:
                                buffer.feed(audio)
                                while buffer.has_chunk():
                                    chunk = buffer.get_chunk()
                                    text = asr.process_chunk(chunk, is_final=False)
                                    if text:
                                        segment_sequence += 1
                                        seg_id = str(uuid.uuid4())

                                        # 推送 ASR 增量结果
                                        await websocket.send_json({
                                            "type": "asr_partial",
                                            "segment_id": seg_id,
                                            "sequence_number": segment_sequence,
                                            "text": text,
                                            "is_final": False,
                                            "timestamp_ms": 0,
                                        })

                                        # 累积文本后翻译
                                        pending_text += " " + text
                                        pending_text = pending_text.strip()
                                        if len(pending_text) > 30:
                                            translation = await _translate_text(pending_text)
                                            print(f"[asr] {pending_text[:60]}...")
                                            print(f"[zh]  {translation[:60]}...")
                                            await websocket.send_json({
                                                "type": "translation_complete",
                                                "segment_id": seg_id,
                                                "translation": translation,
                                                "terminology_applied": [],
                                            })
                                            await websocket.send_json({
                                                "type": "subtitle_entry",
                                                "entry": {
                                                    "id": str(uuid.uuid4()),
                                                    "segment_id": seg_id,
                                                    "sequence_number": segment_sequence,
                                                    "source_text": pending_text,
                                                    "translated_text": translation,
                                                    "is_revised": False,
                                                    "timestamp_ms": 0,
                                                }
                                            })
                                            pending_text = ""

                            await asyncio.sleep(0.05)
                        except RuntimeError:
                            # WebSocket 已关闭
                            break
                        except Exception as e:
                            print(f"[poll] error: {e}")

                poll_task = asyncio.create_task(poll_audio_and_translate())

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
                    poll_task = asyncio.create_task(poll_audio_and_translate())

            # ===== 停止 =====
            elif msg_type == "stop_session":
                running = False
                if asr:
                    final_text = asr.finalize()
                    if final_text:
                        translation = await _translate_text(final_text)
                        await websocket.send_json({
                            "type": "asr_final",
                            "segment_id": str(uuid.uuid4()),
                            "text": final_text,
                            "confidence": 1.0,
                        })
                        await websocket.send_json({
                            "type": "translation_complete",
                            "segment_id": str(uuid.uuid4()),
                            "translation": translation,
                            "terminology_applied": [],
                        })
                await websocket.send_json({"type": "session_ended", "session_id": session_id})
                break

    except WebSocketDisconnect:
        print(f"[ws] session={session_id[:8]} disconnected")
    finally:
        running = False
        if poll_task and not poll_task.done():
            poll_task.cancel()
        if capture:
            capture.stop()
