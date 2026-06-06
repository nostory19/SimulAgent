"""
LangGraph 多智能体流水线定义。

组装 ASR → Context → Translation 的最小流水线 StateGraph，
支持流式事件输出和共享状态管理。

流水线结构：
    START → asr → context → translation → END
"""
from typing import Annotated, Any, List, TypedDict
import operator
import numpy as np


class PipelineState(TypedDict, total=False):
    """LangGraph 流水线共享状态。

    各节点通过 state 读取所需数据、返回增量更新。
    Annotated[List, operator.add] 实现累加式合并（不由返回值覆盖整个列表）。
    """

    # ASR 相关
    audio_chunk: np.ndarray | None  # 当前待处理的音频 chunk（16000Hz, 单声道, float32）
    is_final: bool  # 是否为最后一个 chunk
    asr_full_text: str  # 完整累积的 ASR 识别文本

    # 上下文相关
    context_window: List[str]  # 最近翻译上下文字符串列表
    translation_history: Annotated[List[dict], operator.add]  # 翻译历史记录

    # 翻译相关
    translation: str  # 当前翻译结果
