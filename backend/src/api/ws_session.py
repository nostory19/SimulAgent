"""
WebSocket 会话处理器。

处理单个 WebSocket 连接的全生命周期：
1. 接收会话控制消息（start/pause/resume/stop）
2. 驱动 AudioCapture → AudioBuffer → StreamingASREngine 流水线
3. 对识别文本调用百炼翻译 → 将 asr 和 translation 结果实时推送给前端
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
from ..asr.funasr_engine import StreamingASREngine

# 翻译系统提示词
TRANSLATION_PROMPT = """You are a professional simultaneous interpreter translating from English to Simplified Chinese.
Rules:
- Produce only the Chinese translation. Do not add explanations, notes, or the original English.
- Use natural, fluent Chinese that sounds like a native speaker.
- Preserve proper nouns, product names, and technical acronyms in their original form.
- Keep the translation concise."""


def _get_translation_client():
    """创建百炼 API 异步客户端（OpenAI 兼容模式）。"""
    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


async def _translate_text(text: str, model: str | None = None) -> str:
    """
    调用百炼 API 翻译一段文本（非流式）。

    Args:
        text: 待翻译的英文文本。
        model: 模型名称，默认从 BAILIAN_MODEL 环境变量读取。

    Returns:
        中文翻译文本，失败时返回原文。
    """
    if not text.strip():
        return text

    client = _get_translation_client()
    model_name = model or os.getenv("BAILIAN_MODEL", "qwen3-8b")

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": TRANSLATION_PROMPT},
                {"role": "user", "content": f"Translate: {text}"},
            ],
            temperature=0.3,
            max_tokens=500,
        )
        translated = response.choices[0].message.content
        return translated.strip() if translated else text
    except Exception:
        return text  # 翻译失败时 fallback 到原文


async def handle_session(websocket: WebSocket):
    """
    处理一个 WebSocket 会话。

    消息协议（参考 contracts/websocket.md）：
    - start_session: 启动音频采集 + ASR + 翻译流水线
    - pause_session / resume_session: 暂停/恢复
    - stop_session: 停止会话

    推送消息：
    - asr_partial: 增量识别结果（英文）
    - translation_token / translation_complete: 翻译结果（中文）
    - subtitle_entry: 已确认的字幕条目
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    capture: AudioCapture | None = None
    buffer: AudioBuffer | None = None
    asr: StreamingASREngine | None = None
    running = False
    poll_task: asyncio.Task | None = None
    segment_sequence = 0

    await websocket.send_json({"type": "connected", "session_id": session_id})

    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "code": "INVALID_JSON", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            # ===== 开始采集 + 翻译 =====
            if msg_type == "start_session":
                config = msg.get("config", {})
                source_lang = config.get("source_language", "en")
                target_lang = config.get("target_language", "zh")

                capture = AudioCapture()
                if not capture.start():
                    await websocket.send_json({
                        "type": "error", "code": "AUDIO_CAPTURE_FAILED",
                        "message": "Failed to start audio capture."
                    })
                    continue

                buffer = AudioBuffer(input_rate=capture.sample_rate)
                asr = StreamingASREngine(device="cpu")
                running = True

                await websocket.send_json({
                    "type": "session_started",
                    "session": {
                        "id": session_id,
                        "source_language": source_lang,
                        "target_language": target_lang,
                        "display_mode": config.get("display_mode", "bilingual"),
                        "started_at": None,
                    }
                })

                async def poll_audio_and_translate():
                    """异步轮询：采集音频 → ASR识别 → 百炼翻译 → 推送前端。"""
                    nonlocal segment_sequence
                    pending_text = ""  # 待翻译的累积文本

                    while running:
                        audio = capture.read() if capture else None
                        if audio is not None and buffer is not None:
                            buffer.feed(audio)
                            while buffer.has_chunk() and asr is not None:
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

                                    # 翻译 ASR 文本
                                    pending_text += " " + text
                                    pending_text = pending_text.strip()
                                    if len(pending_text) > 20:  # 积累足够文本后翻译
                                        translation = await _translate_text(pending_text)
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
                # flush ASR 和翻译最后缓存
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
