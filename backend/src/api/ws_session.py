"""
WebSocket 会话处理器。

处理单个 WebSocket 连接的全生命周期：
1. 接收会话控制消息（start/pause/resume/stop）
2. DEMO模式：生成模拟英文文本 → 百炼翻译 → 推送字幕
3. 正式模式：AudioCapture → ASR → 翻译流水线
"""
import asyncio
import json
import os
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI

# 翻译系统提示词
TRANSLATION_PROMPT = """You are a professional simultaneous interpreter translating from English to Simplified Chinese.
Rules:
- Produce only the Chinese translation. Do not add explanations, notes, or the original English.
- Use natural, fluent Chinese that sounds like a native speaker.
- Preserve proper nouns, product names, and technical acronyms in their original form.
- Keep the translation concise."""

# 模拟英文文本列表
DEMO_TEXTS = [
    "Artificial intelligence is transforming every industry around the world.",
    "Machine learning models require large amounts of high-quality training data.",
    "Deep neural networks have achieved remarkable results in natural language processing.",
    "The transformer architecture has become the foundation of modern language models.",
    "Real-time translation systems help people communicate across language barriers.",
    "Computer vision technology enables machines to understand visual information.",
    "Cloud computing provides scalable infrastructure for deploying AI applications.",
    "Data privacy and security are critical considerations in AI system design.",
    "Open source software has accelerated innovation in the machine learning community.",
    "Thank you for watching this demonstration of SimulAgent.",
]


def _get_translation_client():
    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


async def _translate_text(text: str, model: str | None = None) -> str:
    """调用百炼 API 翻译一段文本。"""
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
            extra_body={"enable_thinking": False},  # 百炼 API 非流式调用必需参数
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
    running = False
    task: asyncio.Task | None = None
    segment_sequence = 0

    await websocket.send_json({"type": "connected", "session_id": session_id})
    print(f"[ws] session={session_id} connected")

    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "code": "INVALID_JSON", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")
            print(f"[ws] received: {msg_type}")

            if msg_type == "start_session":
                config = msg.get("config", {})
                source_lang = config.get("source_language", "en")

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

                async def demo_loop():
                    """DEMO模式：每隔2秒发送模拟英文 → 百炼翻译 → 推送字幕。"""
                    nonlocal segment_sequence
                    idx = 0
                    while running:
                        text = DEMO_TEXTS[idx % len(DEMO_TEXTS)]
                        idx += 1
                        segment_sequence += 1
                        seg_id = str(uuid.uuid4())

                        try:
                            # 推送 ASR（英文原文）
                            await websocket.send_json({
                                "type": "asr_partial",
                                "segment_id": seg_id,
                                "sequence_number": segment_sequence,
                                "text": text,
                                "is_final": False,
                                "timestamp_ms": 0,
                            })
                            print(f"[demo] ASR: {text[:50]}...")

                            # 翻译
                            translation = await _translate_text(text)
                            print(f"[demo] ZH: {translation[:50]}...")

                            # 推送翻译结果
                            await websocket.send_json({
                                "type": "translation_complete",
                                "segment_id": seg_id,
                                "translation": translation,
                                "terminology_applied": [],
                            })

                            # 推送字幕条目
                            await websocket.send_json({
                                "type": "subtitle_entry",
                                "entry": {
                                    "id": str(uuid.uuid4()),
                                    "segment_id": seg_id,
                                    "sequence_number": segment_sequence,
                                    "source_text": text,
                                    "translated_text": translation,
                                    "is_revised": False,
                                    "timestamp_ms": 0,
                                }
                            })

                            await asyncio.sleep(2)
                        except RuntimeError:
                            # WebSocket 已关闭，退出循环
                            print("[demo] WebSocket closed, stopping")
                            break

                task = asyncio.create_task(demo_loop())

            elif msg_type == "stop_session":
                running = False
                if task and not task.done():
                    task.cancel()
                await websocket.send_json({
                    "type": "session_ended",
                    "session_id": session_id,
                })
                print(f"[ws] session={session_id} ended")
                break

            elif msg_type == "pause_session":
                running = False
                await websocket.send_json({"type": "session_status", "status": "paused"})

            elif msg_type == "resume_session":
                running = True
                await websocket.send_json({"type": "session_status", "status": "active"})
                if task is None or task.done():
                    task = asyncio.create_task(demo_loop())

    except WebSocketDisconnect:
        print(f"[ws] session={session_id} disconnected")
    finally:
        running = False
        if task and not task.done():
            task.cancel()
