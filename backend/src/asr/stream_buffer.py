"""Audio stream buffer with resampling for ASR pipeline."""
import collections
import numpy as np
from scipy import signal


class AudioBuffer:
    """
    Ring buffer that resamples audio from capture format (48000Hz stereo)
    to ASR format (16000Hz mono) and provides fixed-size chunks.
    """

    def __init__(self, input_rate: int = 48000, target_rate: int = 16000,
                 input_channels: int = 2, chunk_duration_ms: int = 600):
        """
        Args:
            input_rate: Source sample rate (WASAPI = 48000).
            target_rate: Target sample rate (FunASR = 16000).
            input_channels: Source channel count (WASAPI = 2).
            chunk_duration_ms: Output chunk duration in ms for ASR (600ms = 9600 samples @ 16kHz).
        """
        self._input_rate = input_rate
        self._target_rate = target_rate
        self._input_channels = input_channels
        self._chunk_samples = int(target_rate * chunk_duration_ms / 1000)
        self._buffer = np.zeros(0, dtype=np.float32)
        self._resample_ratio = target_rate / input_rate

    def feed(self, audio: np.ndarray):
        """Feed raw audio data (float32, shape: [frames * channels])."""
        # Convert to mono if multi-channel
        if self._input_channels > 1 and audio.ndim > 1:
            audio = audio.mean(axis=1)
        elif self._input_channels > 1:
            audio = audio.reshape(-1, self._input_channels).mean(axis=1)

        # Resample from 48kHz to 16kHz
        target_len = int(len(audio) * self._resample_ratio)
        if target_len > 0:
            resampled = signal.resample(audio, target_len)
            self._buffer = np.concatenate([self._buffer, resampled.astype(np.float32)])

    def has_chunk(self) -> bool:
        return len(self._buffer) >= self._chunk_samples

    def get_chunk(self) -> np.ndarray:
        """Extract exactly one chunk of chunk_samples for ASR processing."""
        if not self.has_chunk():
            raise ValueError(f"Not enough samples: {len(self._buffer)} < {self._chunk_samples}")
        chunk = self._buffer[:self._chunk_samples].copy()
        self._buffer = self._buffer[self._chunk_samples:]
        return chunk

    @property
    def available_samples(self) -> int:
        return len(self._buffer)

    @property
    def chunk_samples(self) -> int:
        return self._chunk_samples

    def clear(self):
        self._buffer = np.zeros(0, dtype=np.float32)
