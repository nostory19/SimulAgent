"""
ASR Agent 节点（LangGraph）。

包装 StreamingASREngine，在 LangGraph 节点内处理音频 chunk，
通过 get_stream_writer() 实时推送增量识别结果到前端。
"""
import numpy as np
from typing import Any
from langgraph.config import get_stream_writer
from ..asr.funasr_engine import StreamingASREngine
from .graph import PipelineState


# 模块级单例 ASR 引擎，避免重复加载模型
_asr_engine: StreamingASREngine | None = None


def _get_asr_engine(source_lang: str = "en", device: str = "cpu") -> StreamingASREngine:
    """获取或初始化 ASR 引擎单例。"""
    global _asr_engine
    if _asr_engine is None:
        _asr_engine = StreamingASREngine(source_lang=source_lang, device=device)
    return _asr_engine


async def asr_node(state: PipelineState) -> dict[str, Any]:
    """
    ASR 识别节点。

    从 state 中读取当前音频 chunk（由 ws_session 预先写入 state），
    调用 FunASR 流式引擎识别，通过 stream writer 推送增量文本。

    Args:
        state: 流水线共享状态，需包含 audio_chunk 字段（16000Hz单声道float32）。

    Returns:
        更新后的状态字典，包含 asr_full_text 累积文本。
    """
    writer = get_stream_writer()
    engine = _get_asr_engine()

    # 从 state 获取当前待处理的音频 chunk
    audio: np.ndarray | None = state.get("audio_chunk")
    is_final: bool = state.get("is_final", False)

    if audio is not None and len(audio) > 0:
        # 调用 ASR 引擎进行增量识别
        text = engine.process_chunk(audio, is_final=is_final)
        if text:
            # 通过 stream writer 推送增量事件到前端
            writer({
                "event": "asr:chunk",
                "text": text,
                "is_final": is_final,
            })

            # 累积全文本
            accumulated = (state.get("asr_full_text", "") + " " + text).strip()
            return {"asr_full_text": accumulated, "audio_chunk": None}

    # 最后一个 chunk 时 flush 残留输出
    if is_final:
        final_text = engine.finalize()
        if final_text:
            writer({"event": "asr:chunk", "text": final_text, "is_final": True})
            accumulated = (state.get("asr_full_text", "") + " " + final_text).strip()
            return {"asr_full_text": accumulated}

    return {"audio_chunk": None}
