"""
Context Agent 节点（LangGraph）。

维护翻译上下文窗口，追踪最近 N 条翻译对，
为 Translation Agent 提供主题一致性上下文。
"""
from typing import Any, List
from .graph import PipelineState

# 上下文窗口大小：保留最近翻译对的数量
CONTEXT_WINDOW_SIZE = 5


async def context_node(state: PipelineState) -> dict[str, Any]:
    """
    上下文管理节点。

    功能：
    1. 从 state 读取最新 ASR 文本和已有翻译
    2. 构建最近 N 对 (源文本, 翻译文本) 作为上下文
    3. 将上下文窗口写入 state 供 Translation Agent 使用

    Args:
        state: 流水线共享状态。

    Returns:
        更新后的状态字典，包含 context_window。
    """
    asr_text: str = state.get("asr_full_text", "")
    translation_history: List[dict] = state.get("translation_history", [])

    # 构建上下文窗口：取最近 CONTEXT_WINDOW_SIZE 条翻译对
    recent_pairs = translation_history[-CONTEXT_WINDOW_SIZE:]

    # 格式化上下文为 Translation Agent 可用的文本
    context_lines: list[str] = []
    for pair in recent_pairs:
        src = pair.get("source", "")
        tgt = pair.get("target", "")
        if src and tgt:
            context_lines.append(f"[EN] {src}\n[ZH] {tgt}")

    context_window: List[str] = context_lines
    return {"context_window": context_window}
