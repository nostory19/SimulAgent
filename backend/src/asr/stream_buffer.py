"""
音频流缓冲区模块。

将 WASAPI 采集的原始音频（48000Hz 立体声 float32）重采样并转换为
FunASR 所需的格式（16000Hz 单声道），按固定时长切分为 chunk 供给 ASR 引擎。
"""
import collections
import numpy as np
from scipy import signal


class AudioBuffer:
    """
    音频重采样缓冲区。

    处理流程：
    1. feed() 接收原始音频 → 立体声转单声道 → 48000Hz 重采样到 16000Hz
    2. 积累到足够样本后，get_chunk() 返回固定大小的 ASR 输入 chunk（600ms）
    """

    def __init__(self, input_rate: int = 48000, target_rate: int = 16000,
                 input_channels: int = 2, chunk_duration_ms: int = 600):
        """
        Args:
            input_rate: 输入采样率（WASAPI 默认 48000Hz）
            target_rate: 目标采样率（FunASR 要求 16000Hz）
            input_channels: 输入声道数（WASAPI 默认 2）
            chunk_duration_ms: 输出 chunk 时长（ms），600ms = 9600 samples @ 16kHz
        """
        self._input_rate = input_rate
        self._target_rate = target_rate
        self._input_channels = input_channels
        self._chunk_samples = int(target_rate * chunk_duration_ms / 1000)
        self._buffer = np.zeros(0, dtype=np.float32)
        self._resample_ratio = target_rate / input_rate  # 采样率转换比例

    def feed(self, audio: np.ndarray):
        """
        喂入原始音频数据。

        Args:
            audio: float32 numpy 数组，shape 为 [frames * channels] 或 [frames, channels]。
                   来自 WASAPI loopback，48000Hz 立体声。
        """
        # 立体声 → 单声道：取各声道平均值
        if self._input_channels > 1 and audio.ndim > 1:
            audio = audio.mean(axis=1)
        elif self._input_channels > 1:
            audio = audio.reshape(-1, self._input_channels).mean(axis=1)

        # 48kHz → 16kHz 重采样
        target_len = int(len(audio) * self._resample_ratio)
        if target_len > 0:
            resampled = signal.resample(audio, target_len)
            self._buffer = np.concatenate([self._buffer, resampled.astype(np.float32)])

    def has_chunk(self) -> bool:
        """缓冲区中是否有足够的样本构成一个完整的 ASR chunk。"""
        return len(self._buffer) >= self._chunk_samples

    def get_chunk(self) -> np.ndarray:
        """
        从缓冲区中取出一个固定大小的音频 chunk。

        Returns:
            float32 numpy 数组，长度为 chunk_samples（如 9600）。

        Raises:
            ValueError: 缓冲区样本不足时抛出。
        """
        if not self.has_chunk():
            raise ValueError(f"Not enough samples: {len(self._buffer)} < {self._chunk_samples}")
        chunk = self._buffer[:self._chunk_samples].copy()
        self._buffer = self._buffer[self._chunk_samples:]  # 移除已取出的样本
        return chunk

    @property
    def available_samples(self) -> int:
        """当前缓冲区中的可用样本数。"""
        return len(self._buffer)

    @property
    def chunk_samples(self) -> int:
        """每个 ASR chunk 的样本数（如 9600）。"""
        return self._chunk_samples

    def clear(self):
        """清空缓冲区。"""
        self._buffer = np.zeros(0, dtype=np.float32)
