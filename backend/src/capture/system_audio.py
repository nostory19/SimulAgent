"""WASAPI loopback audio capture using PyAudioWPatch."""
import collections
import threading
import numpy as np
import pyaudiowpatch as pyaudio
from .device_manager import get_pyaudio, get_default_wasapi_loopback


class AudioCapture:
    """Captures system audio via WASAPI loopback and feeds a ring buffer."""

    def __init__(self, chunk_size: int = 4800):
        """
        Args:
            chunk_size: Frames per buffer. 4800 frames @ 48000Hz = 100ms.
        """
        self._chunk_size = chunk_size
        self._p: pyaudio.PyAudio | None = None
        self._stream: pyaudio.Stream | None = None
        self._ring_buffer = collections.deque(maxlen=500)  # ~50 seconds
        self._running = False
        self._thread: threading.Thread | None = None
        self._device_info: dict | None = None
        self._lock = threading.Lock()

    @property
    def sample_rate(self) -> int:
        return int(self._device_info["defaultSampleRate"]) if self._device_info else 48000

    @property
    def channels(self) -> int:
        return self._device_info["maxInputChannels"] if self._device_info else 2

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self) -> bool:
        """Start capturing system audio. Returns True on success."""
        device = get_default_wasapi_loopback()
        if device is None:
            return False

        self._device_info = device
        self._p = get_pyaudio()
        self._stream = self._p.open(
            format=pyaudio.paFloat32,
            channels=device["maxInputChannels"],
            rate=int(device["defaultSampleRate"]),
            frames_per_buffer=self._chunk_size,
            input=True,
            input_device_index=device["index"],
            stream_callback=self._audio_callback,
        )
        self._running = True
        return True

    def _audio_callback(self, in_data, frame_count, time_info, status):
        """PortAudio callback - called from real-time audio thread."""
        samples = np.frombuffer(in_data, dtype=np.float32).copy()
        with self._lock:
            self._ring_buffer.append(samples)
        return (in_data, pyaudio.paContinue)

    def read(self) -> np.ndarray | None:
        """Read one chunk of audio data from the ring buffer (non-blocking)."""
        with self._lock:
            if self._ring_buffer:
                return self._ring_buffer.popleft()
        return None

    def read_all(self) -> np.ndarray | None:
        """Read all available audio data from the ring buffer."""
        with self._lock:
            if not self._ring_buffer:
                return None
            data = np.concatenate(list(self._ring_buffer))
            self._ring_buffer.clear()
            return data

    def stop(self):
        """Stop capturing and release resources."""
        self._running = False
        if self._stream:
            self._stream.stop_stream()
            self._stream.close()
            self._stream = None
        if self._p:
            self._p.terminate()
            self._p = None
