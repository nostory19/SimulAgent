"""
WebSocket 会话处理器——智能同声传译模式。

优化特性：
1. 智能断句：VAD静音检测 + 标点符号 + 语义完整性判断
2. 术语一致性：翻译缓存表，同一term前后翻译一致
3. 上下文窗口：注入最近3句完整上文供翻译参考
4. 渐进精炼：后文修正前文，先草稿后精修
"""
import asyncio
import json
import os
import queue
import re
import time
import uuid
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI
from sqlalchemy import update as sql_update
from ..agents.revision_agent import check_and_revise
from ..capture.system_audio import AudioCapture
from ..models.database import async_session
from ..models.session import CaptureSession
from ..models.transcription import TranscriptionSegment
from ..models.translation import TranslationEntry
from ..asr.stream_buffer import AudioBuffer
from ..asr.funasr_engine import get_asr_engine
from ..asr.bailian_asr import BailianRealtimeASR
import numpy as np

# ===== 翻译提示词模板 =====
TRANSLATION_SYSTEM = """You are a professional simultaneous interpreter translating English to Simplified Chinese.
- Produce only the Chinese translation. No explanations.
- Natural, fluent, native-level Chinese.
- Keep proper nouns and acronyms in original form."""

TRANSLATION_WITH_CONTEXT = """Translate to Chinese. Use the context and terminology below for consistency.

Previous context (for reference):
{context}

Consistent terminology:
{terminology}

Text to translate: {text}"""

# ===== 智能断句相关 =====
SENTENCE_END_PUNCT = {'.', '!', '?', '。', '！', '？', '\n'}
COMMA_PUNCT = {',', ';', ':', '，', '；', '：', '—', '-'}
MIN_SEGMENT_CHARS = 15    # 最少字符才构成一个完整句段
MIN_SILENCE_SEC = 0.4     # 静音>0.4秒视为断句边界（配合VAD的500ms）
MAX_FORCE_CHARS = 50      # 超过50字符强制断句（避免等待过长）

# ===== 术语缓存 =====
TERM_CACHE: dict[str, str] = {}   # {english_term: chinese_translation}

# 高频技术术语预置表（启动时加载，翻译时优先使用）
PRESET_TERMS: dict[str, str] = {
    "artificial intelligence": "人工智能",
    "machine learning": "机器学习",
    "deep learning": "深度学习",
    "neural network": "神经网络",
    "natural language processing": "自然语言处理",
    "computer vision": "计算机视觉",
    "transformer": "Transformer架构",
    "foundation model": "基础模型",
    "large language model": "大语言模型",
    "reinforcement learning": "强化学习",
    "generative adversarial network": "生成对抗网络",
    "backpropagation": "反向传播",
    "gradient descent": "梯度下降",
    "attention mechanism": "注意力机制",
    "embedding": "嵌入",
    "fine-tuning": "微调",
    "pre-training": "预训练",
    "zero-shot": "零样本",
    "few-shot": "少样本",
    "chain of thought": "思维链",
    "retrieval augmented generation": "检索增强生成",
}


def _get_translation_client():
    api_key = os.getenv("BAILIAN_API_KEY", "")
    base_url = os.getenv("BAILIAN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    return AsyncOpenAI(api_key=api_key, base_url=base_url)


def _detect_segment_boundary(text: str, silence_sec: float) -> bool:
    """
    智能断句检测。

    条件（满足任一即视为断句边界）：
    1. 句末标点(.!?) + 静音 >0.2秒 → 完整句
    2. 逗号类标点 + 静音 >0.5秒 + 文本>15字符 → 子句停顿
    3. 静音 > MIN_SILENCE_SEC + 文本长度 > MIN_SEGMENT_CHARS → VAD已确认段落
    4. 文本长度 > MAX_FORCE_CHARS → 强制断（不再让用户等太久）
    """
    text = text.strip()
    if not text:
        return False
    # 条件1：句末标点
    if text[-1] in SENTENCE_END_PUNCT and silence_sec > 0.2:
        return True
    # 条件2：逗号子句 + 较长静音
    if text[-1] in COMMA_PUNCT and silence_sec > 0.5 and len(text) >= MIN_SEGMENT_CHARS:
        return True
    # 条件3：静音确认的段落（VAD已触发）
    if silence_sec > MIN_SILENCE_SEC and len(text) >= MIN_SEGMENT_CHARS:
        return True
    # 条件4：强制断句，不让用户等太久
    if len(text) >= MAX_FORCE_CHARS:
        return True
    return False


def _extract_terms(text: str) -> list[str]:
    """从文本中提取已知术语（包括词和短语）。"""
    found = []
    text_lower = text.lower()
    for term in {**PRESET_TERMS, **TERM_CACHE}:
        if term.lower() in text_lower and term not in found:
            found.append(term)
    return found


def _build_context_prompt(context: list[dict]) -> str:
    """构建最近3句上文文本，供翻译参考。"""
    if not context:
        return "(none - this is the first sentence)"
    parts = []
    for i, item in enumerate(context[-3:]):
        parts.append(f"[{i+1}] EN: {item['source']}\n    ZH: {item['translation']}")
    return "\n".join(parts)


def _build_terminology_hint(text: str) -> str:
    """提取文本中的已知术语及其缓存翻译。"""
    terms = _extract_terms(text)
    if not terms:
        return "(none)"
    hints = []
    for t in terms:
        zh = TERM_CACHE.get(t) or PRESET_TERMS.get(t, "")
        if zh:
            hints.append(f"{t} → {zh}")
    return "\n".join(hints) if hints else "(none)"


async def _translate_stream(text: str, websocket: WebSocket,
                             context: list[dict] | None = None) -> str:
    """
    流式翻译：逐 token 推送，注入上下文和术语提示。

    Args:
        text: 待翻译文本。
        websocket: WebSocket连接。
        context: 最近的(source, translation)上下文列表。
    """
    if not text.strip():
        return text
    client = _get_translation_client()
    model_name = os.getenv("BAILIAN_MODEL", "qwen3-8b")

    ctx_text = _build_context_prompt(context or [])
    term_text = _build_terminology_hint(text)

    # 用上下文+术语注入prompt vs 简洁prompt
    if context or _extract_terms(text):
        user_msg = TRANSLATION_WITH_CONTEXT.format(
            context=ctx_text, terminology=term_text, text=text
        )
    else:
        user_msg = f"Translate: {text}"

    accumulated = []
    try:
        stream = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": TRANSLATION_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,
            max_tokens=500,
            stream=True,
            extra_body={"enable_thinking": False},
        )
        idx = 0
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                accumulated.append(delta.content)
                idx += 1
                try:
                    await websocket.send_json({
                        "type": "translation_token",
                        "token": delta.content,
                        "token_index": idx,
                    })
                except RuntimeError:
                    break
        return "".join(accumulated)
    except Exception as e:
        print(f"[translate_stream] error: {e}")
        return text


async def _translate_text(text: str) -> str:
    """非流式翻译（flush场景）。"""
    if not text.strip():
        return text
    client = _get_translation_client()
    model_name = os.getenv("BAILIAN_MODEL", "qwen3-8b")
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": TRANSLATION_SYSTEM},
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


def _update_term_cache(source: str, translation: str):
    """翻译完成后更新术语缓存，确保后续同一术语翻译一致。"""
    terms = _extract_terms(source)
    for term in terms:
        if term not in TERM_CACHE:
            # 尝试从翻译中匹配对应中文（简单策略：保存等待下次匹配）
            TERM_CACHE[term] = translation


async def handle_session(websocket: WebSocket):
    """处理 WebSocket 会话——智能同声传译。"""
    await websocket.accept()
    session_id = str(uuid.uuid4())
    capture: AudioCapture | None = None
    buffer: AudioBuffer | None = None
    running = False
    poll_task: asyncio.Task | None = None

    await websocket.send_json({"type": "connected", "session_id": session_id})
    print(f"[ws] session={session_id[:8]} connected")

    # 会话级别变量（在函数作用域初始化，避免跨迭代访问问题）
    db_session_started_at = None
    session_stats = {"segment_count": 0}

    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            msg_type = msg.get("type")

            if msg_type == "start_session":
                config = msg.get("config", {})
                source_lang = config.get("source_language", "en")

                # 音频源：loopback=系统音频, microphone=麦克风
                audio_source = config.get("audio_source", "loopback")
                capture = AudioCapture(mode=audio_source)
                if not capture.start():
                    await websocket.send_json({
                        "type": "error", "code": "AUDIO_CAPTURE_FAILED",
                        "message": "无法启动音频采集"
                    })
                    continue

                buffer = AudioBuffer(input_rate=capture.sample_rate)
                running = True
                # 选择 ASR 引擎
                # 百炼云端实时 ASR（BAILIAN_API_KEY 可用时优先使用）
                use_cloud_asr = True if os.getenv("BAILIAN_API_KEY") or os.getenv("DASHSCOPE_API_KEY") else False
                cloud_queue: queue.Queue = queue.Queue()  # 线程安全队列
                if use_cloud_asr:
                    cloud_asr = BailianRealtimeASR(source_lang=source_lang)
                    # 跨线程回调：直接写入线程安全队列
                    cloud_asr.on_result = lambda t: cloud_queue.put(t)
                    cloud_asr.start()
                    # 等待 task-started（最多5秒）
                    for _ in range(50):
                        await asyncio.sleep(0.1)
                        if cloud_asr.is_active():
                            break
                    print(f"[ws] Bailian cloud ASR ({source_lang}), task_started={cloud_asr.is_active()}")
                else:
                    local_asr = get_asr_engine(source_lang=source_lang, device="cpu")
                    print(f"[ws] local FunASR ({source_lang})")
                # 重置会话统计和术语缓存
                session_stats["segment_count"] = 0
                TERM_CACHE.clear()
                TERM_CACHE.update(PRESET_TERMS)

                await websocket.send_json({
                    "type": "session_started",
                    "session": {
                        "id": session_id,
                        "source_language": source_lang,
                        "target_language": "zh",
                        "display_mode": config.get("display_mode", "bilingual"),
                    }
                })
                print(f"[ws] capture started, device={capture.sample_rate}Hz")

                # ===== 数据库：创建会话记录 =====
                db_session_started_at = datetime.now(timezone.utc)
                async with async_session() as db:
                    db_session = CaptureSession(
                        id=session_id,
                        title=config.get("title"),
                        source_language=source_lang,
                        target_language="zh",
                        display_mode=config.get("display_mode", "bilingual"),
                        status="active",
                        audio_source=audio_source,
                        started_at=db_session_started_at,
                    )
                    db.add(db_session)
                    await db.commit()

                async def poll_smart_translate():
                    """智能同传主循环：音频采集→ASR→智能断句→带上下文流式翻译→术语缓存→渐进精炼。"""
                    full_source = ""         # 全部累积原文
                    full_translation = ""   # 全部累积译文
                    untranslated = ""       # 上次翻译后新增的原文
                    context_history: list[dict] = []  # 最近3句上下文
                    last_audio_time = time.time()
                    last_text_change = time.time()
                    last_entry_id = None

                    while running:
                        try:
                            audio = capture.read() if capture else None
                            now = time.time()

                            if audio is not None and buffer is not None:
                                buffer.feed(audio)
                                last_audio_time = now

                                text = None
                                if use_cloud_asr:
                                    # 云端模式：发送音频到百炼 + 读最新完整结果
                                    while buffer.has_chunk():
                                        chunk = buffer.get_chunk()
                                        i16 = (chunk * 32767).clip(-32768, 32767).astype(np.int16)
                                        cloud_asr.send_audio(i16)
                                    # 取队列中最后一个（最完整的）结果
                                    text = None
                                    while True:
                                        try:
                                            t = cloud_queue.get_nowait()
                                            if t:
                                                text = t
                                        except queue.Empty:
                                            break
                                else:
                                    # 本地模式：FunASR 处理
                                    text = None
                                    while buffer.has_chunk():
                                        chunk = buffer.get_chunk()
                                        text = local_asr.process_chunk(chunk, is_final=False)

                                if text:
                                    if use_cloud_asr:
                                        # 云端模式：原文实时推送（上方asr_partial已推送）
                                        # 翻译仅当句子完整时才触发（句末标点或稳定1.5秒）
                                        if text != full_source:
                                            last_text_change = time.time()
                                        full_source = text
                                        untranslated = text
                                        # 句子完整判断：句末标点 OR 文本稳定>1.5s
                                        has_punct = text.strip().endswith(('.', '!', '?', '。', '！', '？'))
                                        stable = (now - last_text_change) > 1.5
                                        should_translate = (has_punct or stable) and len(text.strip()) > 10
                                        mode_label = "cloud"
                                    else:
                                        # 本地模式：追加+断句检测
                                        full_source += (" " if full_source else "") + text
                                        untranslated += (" " if untranslated else "") + text
                                        silence = now - last_audio_time
                                        if local_asr._is_streaming:
                                            should_translate = _detect_segment_boundary(untranslated, silence)
                                            mode_label = "stream"
                                        else:
                                            should_translate = len(untranslated.strip()) > 3
                                            mode_label = "vad"

                                    # ===== 推送实时原文 =====
                                    try:
                                        await websocket.send_json({
                                            "type": "asr_partial",
                                            "text": full_source,
                                        })
                                    except RuntimeError:
                                        break

                                    # 云端模式：文本变化即翻译，无需防抖等待

                                    if should_translate and len(untranslated.strip()) > 3:
                                        to_translate = untranslated.strip()
                                        print(f"[seg] {to_translate[:80]}... (mode={mode_label})")

                                        # 云端全量文本不需上下文注入，本地增量需要
                                        _ctx = [] if use_cloud_asr else context_history
                                        translation = await _translate_stream(to_translate, websocket, _ctx)
                                        print(f"[zh]  {translation[:80]}...")

                                        # ===== 更新术语缓存 =====
                                        _update_term_cache(to_translate, translation)
                                        context_history.append({
                                            "source": to_translate,
                                            "translation": translation,
                                        })
                                        # 只保留最近3句
                                        context_history = context_history[-3:]

                                        # ===== 追加到全文翻译 =====
                                        # 云端模式：每次翻译的是全量文本，直接替换避免重复
                                        # 本地模式：每次翻译的是增量文本，追加到后面
                                        if use_cloud_asr:
                                            full_translation = translation
                                        else:
                                            full_translation += (" " if full_translation else "") + translation
                                        untranslated = ""

                                        # ===== 推送累积译文 =====
                                        entry_id = str(uuid.uuid4())
                                        seg_id = str(uuid.uuid4())
                                        try:
                                            await websocket.send_json({
                                                "type": "subtitle_entry",
                                                "entry": {
                                                    "id": entry_id,
                                                    "source_text": full_source,
                                                    "translated_text": full_translation,
                                                    "segment_source": to_translate,
                                                    "segment_translation": translation,
                                                    "is_revised": False,
                                                }
                                            })
                                        except RuntimeError:
                                            break

                                        # ===== 数据库：保存ASR段 + 翻译记录 =====
                                        session_stats["segment_count"] += 1
                                        now_ts = int(time.time() * 1000)
                                        try:
                                            async with async_session() as db:
                                                seg = TranscriptionSegment(
                                                    id=seg_id,
                                                    session_id=session_id,
                                                    sequence_number=session_stats["segment_count"],
                                                    source_text=to_translate,
                                                    start_time_ms=now_ts - 2000,
                                                    end_time_ms=now_ts,
                                                    confidence=None,
                                                    is_partial=False,
                                                )
                                                db.add(seg)
                                                trans = TranslationEntry(
                                                    id=entry_id,
                                                    segment_id=seg_id,
                                                    session_id=session_id,
                                                    translated_text=full_translation,
                                                    is_revised=False,
                                                    revision_count=0,
                                                )
                                                db.add(trans)
                                                await db.commit()
                                        except Exception as e:
                                            print(f"[db] save error: {e}")

                                        # ===== 渐进精炼：云端模式跳过（全量替换无需修正），本地模式检查 =====
                                        if not use_cloud_asr and len(context_history) >= 2:
                                            prev = context_history[-2]
                                            revised = await check_and_revise(
                                                original_text=prev["source"],
                                                old_translation=prev["translation"],
                                                new_context=to_translate,
                                            )
                                            if revised:
                                                print(f"[revision] {prev['translation'][:40]}... → {revised[:40]}...")
                                                # 更新上下文中的翻译
                                                prev["translation"] = revised
                                                # 更新全文翻译（替换旧部分）
                                                old_part = prev["translation"]
                                                full_translation = full_translation.replace(
                                                    old_part, revised, 1
                                                )
                                                try:
                                                    await websocket.send_json({
                                                        "type": "revision",
                                                        "entry_id": entry_id,
                                                        "old_translation": old_part,
                                                        "new_translation": revised,
                                                        "reason": "context_clarification",
                                                    })
                                                except RuntimeError:
                                                    break
                                        last_entry_id = entry_id

                            else:
                                # 无音频时检查静音超时
                                silence = now - last_audio_time
                                if untranslated.strip() and silence > 1.5:
                                    # 静音超过1.5秒，强制翻译剩余文本
                                    to_translate = untranslated.strip()
                                    if len(to_translate) > 5:
                                        print(f"[silence] force translate: {to_translate[:60]}...")
                                        _ctx2 = [] if use_cloud_asr else context_history
                                        translation = await _translate_stream(
                                            to_translate, websocket, _ctx2
                                        )
                                        if use_cloud_asr:
                                            full_translation = translation
                                        else:
                                            full_translation += (" " if full_translation else "") + translation
                                        context_history.append({
                                            "source": to_translate,
                                            "translation": translation,
                                        })
                                        context_history = context_history[-3:]
                                        untranslated = ""
                                        try:
                                            await websocket.send_json({
                                                "type": "subtitle_entry",
                                                "entry": {
                                                    "id": str(uuid.uuid4()),
                                                    "source_text": full_source,
                                                    "translated_text": full_translation,
                                                    "segment_source": to_translate,
                                                    "segment_translation": translation,
                                                    "is_revised": False,
                                                }
                                            })
                                        except RuntimeError:
                                            break

                            await asyncio.sleep(0.05)
                        except RuntimeError:
                            break
                        except Exception as e:
                            print(f"[poll] error: {e}")

                poll_task = asyncio.create_task(poll_smart_translate())

            elif msg_type == "stop_session":
                running = False
                # 停止 ASR 并获取最后缓冲的文本
                if use_cloud_asr:
                    cloud_asr.stop()
                    # 取队列中最后的结果
                    last_text = None
                    while True:
                        try:
                            t = cloud_queue.get_nowait()
                            if t:
                                last_text = t
                        except queue.Empty:
                            break
                    final_text = last_text
                else:
                    final_text = local_asr.finalize()
                    if final_text:
                        translation = await _translate_text(final_text)
                        try:
                            await websocket.send_json({
                                "type": "translation_complete",
                                "translation": translation,
                            })
                        except RuntimeError:
                            pass

                # ===== 数据库：更新会话结束状态 =====
                try:
                    ended_at = datetime.now(timezone.utc)
                    duration = int((ended_at - db_session_started_at).total_seconds()) if db_session_started_at else 0
                    async with async_session() as db:
                        await db.execute(
                            sql_update(CaptureSession)
                            .where(CaptureSession.id == session_id)
                            .values(
                                status="completed",
                                ended_at=ended_at,
                                duration_seconds=duration,
                                total_segments=session_stats.get("segment_count", 0),
                            )
                        )
                        await db.commit()
                        print(f"[db] session saved: {session_stats['segment_count']} segments, {duration}s")
                except Exception as e:
                    print(f"[db] session update error: {e}")

                await websocket.send_json({"type": "session_ended", "session_id": session_id})
                break

            elif msg_type == "pause_session":
                running = False
                await websocket.send_json({"type": "session_status", "status": "paused"})

            elif msg_type == "resume_session":
                if capture and not capture.is_running:
                    capture.start()
                running = True
                await websocket.send_json({"type": "session_status", "status": "active"})
                if poll_task is None or poll_task.done():
                    poll_task = asyncio.create_task(poll_smart_translate())

    except WebSocketDisconnect:
        print(f"[ws] session={session_id[:8]} disconnected")
    finally:
        running = False
        if poll_task and not poll_task.done():
            poll_task.cancel()
        if capture:
            capture.stop()
