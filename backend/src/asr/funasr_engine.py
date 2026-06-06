"""
FunASR 流式语音识别引擎封装。

加载 paraformer-zh-streaming 模型，提供 chunk 级别的增量识别接口，
通过 cache 字典维护跨 chunk 的编码器/解码器状态。
"""
import numpy as np
from funasr import AutoModel


class StreamingASREngine:
    """
    FunASR 流式 ASR 引擎。

    核心参数 chunk_size=[0, 10, 5] 含义（单位：60ms 帧）：
    - [0]: 左上下文（由 cache 自动管理，设为 0）
    - [1]=10: 当前 chunk 大小 = 600ms
    - [2]=5: 右上下文（lookahead）= 300ms
    """

    def __init__(self, model_name: str = "paraformer-zh-streaming", device: str = "cpu"):
        """
        Args:
            model_name: FunASR 模型名称。默认 paraformer-zh-streaming（支持中英文流式识别）。
            device: 推理设备，"cpu" 或 "cuda"。
        """
        self._model = AutoModel(
            model=model_name,
            device=device,
            disable_pbar=True,  # 关闭进度条
            disable_log=True,   # 关闭日志输出
        )
        self._chunk_size = [0, 10, 5]  # 600ms chunk + 300ms lookahead
        self._cache: dict = {}  # 跨 chunk 状态缓存
        self._sample_rate = 16000

    def reset(self):
        """重置 ASR 状态，开始新的 utterance 前调用。"""
        self._cache = {}

    def process_chunk(self, audio: np.ndarray, is_final: bool = False) -> str | None:
        """
        处理一个音频 chunk，返回增量识别文本。

        Args:
            audio: float32 numpy 数组，16000Hz 单声道，约 9600 samples (600ms)。
            is_final: 是否为最后一个 chunk（触发解码器 flush）。

        Returns:
            本次 chunk 新识别出的增量文本，无新内容时返回 None。
        """
        result = self._model.generate(
            input=audio,
            cache=self._cache,  # 传入同一个 dict 以保持跨 chunk 状态
            is_final=is_final,
            chunk_size=self._chunk_size,
            encoder_chunk_look_back=4,  # encoder 可回看前 4 个 chunk
            decoder_chunk_look_back=1,  # decoder 交叉注意力回看 1 个 chunk
        )
        # 提取识别文本（如有）
        if result and result[0].get("text"):
            return result[0]["text"]
        return None

    def finalize(self) -> str | None:
        """会话结束时调用，flush 解码器中缓存的最后输出。"""
        result = self._model.generate(
            input=None,  # None 表示流结束
            cache=self._cache,
            is_final=True,
            chunk_size=self._chunk_size,
        )
        self._cache = {}  # 重置状态
        if result and result[0].get("text"):
            return result[0]["text"]
        return None
