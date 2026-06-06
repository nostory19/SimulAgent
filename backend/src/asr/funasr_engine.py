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

    def __init__(self, model_name: str = "paraformer-zh-streaming", device: str = "cpu",
                 mock: bool = False):
        """
        Args:
            model_name: FunASR 模型名称。
            device: 推理设备，"cpu" 或 "cuda"。
            mock: True 时使用模拟ASR（无模型依赖，用于测试），False 时加载真实模型。
        """
        self._mock = mock
        self._chunk_size = [0, 10, 5]
        self._cache: dict = {}
        self._sample_rate = 16000
        self._mock_counter = 0

        if not mock:
            self._model = AutoModel(
                model=model_name,
                device=device,
                disable_pbar=True,
                disable_log=True,
            )
        else:
            self._model = None

    def reset(self):
        """重置 ASR 状态，开始新的 utterance 前调用。"""
        self._cache = {}

    def process_chunk(self, audio: np.ndarray, is_final: bool = False) -> str | None:
        """
        处理一个音频 chunk，返回增量识别文本。

        mock 模式下返回模拟英文文本，用于端到端测试流水线。
        """
        if self._mock:
            self._mock_counter += 1
            # 每3个chunk返回一段模拟识别文本
            if self._mock_counter % 3 == 0:
                phrases = [
                    "Today I'd like to talk about artificial intelligence.",
                    "The future of technology is very promising.",
                    "Machine learning has transformed many industries.",
                    "We need to consider the ethical implications.",
                    "Let me show you some examples of this approach.",
                    "This research was conducted over three years.",
                    "The results demonstrate significant improvements.",
                    "I think this is a very important question.",
                    "Deep learning models require large amounts of data.",
                    "Thank you for your attention today.",
                ]
                return phrases[(self._mock_counter // 3) % len(phrases)]
            return None

        result = self._model.generate(
            input=audio,
            cache=self._cache,
            is_final=is_final,
            chunk_size=self._chunk_size,
            encoder_chunk_look_back=4,
            decoder_chunk_look_back=1,
        )
        if result and result[0].get("text"):
            return result[0]["text"]
        return None

    def finalize(self) -> str | None:
        """会话结束时调用，flush 解码器中缓存的最后输出。"""
        if self._mock:
            self._mock_counter = 0
            return "Thank you all for listening."
        result = self._model.generate(
            input=None,
            cache=self._cache,
            is_final=True,
            chunk_size=self._chunk_size,
        )
        self._cache = {}
        if result and result[0].get("text"):
            return result[0]["text"]
        return None


# 全局单例 ASR 引擎，避免重复加载模型
_asr_singleton: StreamingASREngine | None = None


def get_asr_engine(device: str = "cpu", mock: bool = False) -> StreamingASREngine:
    """获取或创建 ASR 引擎单例。"""
    global _asr_singleton
    if _asr_singleton is None:
        _asr_singleton = StreamingASREngine(device=device, mock=mock)
    return _asr_singleton
