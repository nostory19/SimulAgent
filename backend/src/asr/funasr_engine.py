"""
语音识别引擎——按源语言自动选择最优模型。

- 英文(en) → SenseVoiceSmall（VAD + 批处理，WER ~4-5%）
- 中文(zh) → paraformer-zh-streaming（原生流式，中文最优）
- 日韩(ja/ko) → SenseVoiceSmall（多语言支持）
"""
import numpy as np
from funasr import AutoModel

# 按源语言选择最优模型
ASR_MODEL_MAP = {
    "en": "iic/SenseVoiceSmall",
    "zh": "paraformer-zh-streaming",
    "ja": "iic/SenseVoiceSmall",
    "ko": "iic/SenseVoiceSmall",
}

# 流式语言（使用 chunk 级增量识别），其他用 VAD+批处理
STREAMING_LANGS = {"zh"}


class StreamingASREngine:
    """
    自适应 ASR 引擎。

    中文(zh)：流式 chunk 增量识别
    英文等其他：VAD 实时检测语音段 + 批处理模型高精度转写
    """

    def __init__(self, source_lang: str = "en", device: str = "cpu",
                 mock: bool = False):
        self._mock = mock
        self._source_lang = source_lang
        self._model_name = ASR_MODEL_MAP.get(source_lang, "iic/SenseVoiceSmall")
        self._is_streaming = source_lang in STREAMING_LANGS
        self._sample_rate = 16000
        self._mock_counter = 0

        if not mock:
            if self._is_streaming:
                # 中文流式：chunk 增量识别
                self._model = AutoModel(
                    model=self._model_name,
                    device=device,
                    disable_pbar=True, disable_log=True,
                )
                self._chunk_size = [0, 8, 4]
                self._cache: dict = {}
                print(f"[ASR] streaming({source_lang}): {self._model_name}")
            else:
                # 英文等：VAD + 批处理高精度
                self._model = AutoModel(
                    model=self._model_name,
                    vad_model="fsmn-vad",
                    vad_kwargs={
                        "max_single_segment_time": 15000,
                        "max_end_silence_time": 500,
                        "speech_noise_thres": 0.6,
                    },
                    device=device,
                    disable_pbar=True, disable_log=True,
                )
                print(f"[ASR] vad+batch({source_lang}): {self._model_name}")
        else:
            self._model = None

    def reset(self):
        if hasattr(self, '_cache'):
            self._cache = {}

    def process_chunk(self, audio: np.ndarray, is_final: bool = False) -> str | None:
        """处理音频 chunk，返回识别文本。"""
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
                    "Deep learning models require large amounts of data.",
                    "Thank you for your attention today.",
                ]
                return phrases[(self._mock_counter // 3) % len(phrases)]
            return None

        if self._is_streaming:
            # 中文流式模式
            result = self._model.generate(
                input=audio, cache=self._cache, is_final=is_final,
                chunk_size=self._chunk_size,
                encoder_chunk_look_back=4, decoder_chunk_look_back=1,
            )
        else:
            # 英文等：VAD + 批处理，传语言参数
            result = self._model.generate(
                input=audio, language=self._source_lang,
                use_itn=True, batch_size_s=30,
            )

        if result and result[0].get("text"):
            return result[0]["text"]
        return None

    def finalize(self) -> str | None:
        """会话结束时调用，flush 缓冲数据。"""
        if self._mock:
            self._mock_counter = 0
            return "Thank you all for listening."
        lang = self._source_lang
        result = self._model.generate(input=None, is_final=True, language=lang)
        if self._is_streaming:
            self._cache = {}
        if result and result[0].get("text"):
            return result[0]["text"]
        return None


# 全局单例（按语言缓存，避免切换语言时加载错误模型）
_engines: dict[str, StreamingASREngine] = {}


def get_asr_engine(source_lang: str = "en", device: str = "cpu", mock: bool = False
                   ) -> StreamingASREngine:
    """获取或创建指定语言的 ASR 引擎单例。"""
    key = f"{source_lang}_{device}_{mock}"
    if key not in _engines:
        _engines[key] = StreamingASREngine(source_lang=source_lang, device=device, mock=mock)
    return _engines[key]
