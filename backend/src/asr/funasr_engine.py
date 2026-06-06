"""
语音识别引擎封装——混合准实时模式。

架构：FSMN-VAD 实时检测语音段 + SenseVoiceSmall 高精度识别
- SenseVoiceSmall 英文 WER ~4-5%（vs paraformer-zh-streaming 中文优化~6.5% CER）
- VAD 在语音段结束时触发识别，延迟约200-500ms（等待静音确认）
- 优势：识别更准确，错误更少 → 翻译更准确
"""
import numpy as np
from funasr import AutoModel


class StreamingASREngine:
    """
    混合 ASR 引擎：VAD 实时检测 + 高精度批处理模型识别。

    流程：
    1. VAD 持续检测音频流中的语音边界
    2. 语音段结束（静音确认）→ 立即调用 SenseVoiceSmall 转写
    3. 流式模拟：分段输出，延迟控制在500ms内
    """

    def __init__(self, model_name: str = "iic/SenseVoiceSmall", device: str = "cpu",
                 mock: bool = False):
        """
        Args:
            model_name: ASR 模型。默认 SenseVoiceSmall（英文最优）。
            device: "cpu" 或 "cuda"。
            mock: True 时使用模拟数据。
        """
        self._mock = mock
        self._sample_rate = 16000
        self._mock_counter = 0
        self._pending_text = ""  # VAD 已确认但尚未输出的文本

        if not mock:
            # 方案：加载 VAD + ASR 两个模型
            # VAD: 实时检测语音边界，max_single_segment_time 避免单段过长
            # ASR: 高精度批处理模型，在VAD确认段落后立即转写
            self._model = AutoModel(
                model=model_name,
                vad_model="fsmn-vad",
                vad_kwargs={
                    "max_single_segment_time": 15000,  # 单段最长15秒
                    "max_end_silence_time": 500,       # 500ms静音视为段落结束
                    "speech_noise_thres": 0.6,
                },
                device=device,
                disable_pbar=True,
                disable_log=True,
            )
        else:
            self._model = None

    def reset(self):
        self._pending_text = ""

    def process_chunk(self, audio: np.ndarray, is_final: bool = False) -> str | None:
        """
        处理音频 chunk，返回识别文本。

        VAD 确认语音段结束 → 模型转写 → 返回识别结果。
        """
        if self._mock:
            self._mock_counter += 1
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

        # 调用模型（VAD + ASR 一体化），返回已确认的语音段文本
        result = self._model.generate(
            input=audio,
            language="en",       # 强制英文识别
            use_itn=True,        # 逆文本正则化（数字/符号标准化）
            batch_size_s=30,     # 动态批处理窗口30秒
        )
        if result and result[0].get("text"):
            return result[0]["text"]
        return None

    def finalize(self) -> str | None:
        """会话结束时调用，flush 最后缓冲的语音。"""
        if self._mock:
            self._mock_counter = 0
            return "Thank you all for listening."
        result = self._model.generate(
            input=None,
            is_final=True,
            language="en",
        )
        if result and result[0].get("text"):
            return result[0]["text"]
        return None


# 全局单例
_asr_singleton: StreamingASREngine | None = None


def get_asr_engine(device: str = "cpu", mock: bool = False) -> StreamingASREngine:
    """获取或创建 ASR 引擎单例。"""
    global _asr_singleton
    if _asr_singleton is None:
        _asr_singleton = StreamingASREngine(device=device, mock=mock)
    return _asr_singleton
