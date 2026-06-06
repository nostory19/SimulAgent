"""FunASR streaming ASR engine wrapper."""
import numpy as np
from funasr import AutoModel


class StreamingASREngine:
    """Wraps FunASR paraformer-zh-streaming for incremental speech recognition."""

    def __init__(self, model_name: str = "paraformer-zh-streaming", device: str = "cpu"):
        self._model = AutoModel(
            model=model_name,
            device=device,
            disable_pbar=True,
            disable_log=True,
        )
        self._chunk_size = [0, 10, 5]  # 600ms chunk, 300ms lookahead
        self._cache: dict = {}
        self._sample_rate = 16000

    def reset(self):
        """Reset ASR state for a new utterance/session."""
        self._cache = {}

    def process_chunk(self, audio: np.ndarray, is_final: bool = False) -> str | None:
        """
        Process one audio chunk and return incremental text.

        Args:
            audio: float32 numpy array, 16000Hz mono, ~9600 samples (600ms).
            is_final: True on the last chunk to flush buffered output.

        Returns:
            Incremental recognized text, or None if no new text.
        """
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
        """Flush final ASR output. Call at end of session."""
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
