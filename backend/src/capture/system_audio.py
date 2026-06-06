"""
WASAPI Loopback 系统音频采集器。

使用 PyAudioWPatch 的 WASAPI loopback 功能采集系统音频输出（扬声器/耳机），
通过 callback 模式将音频推入线程安全的 ring buffer，供下游 ASR 模块消费。
"""
import collections
import threading
import numpy as np
import pyaudiowpatch as pyaudio
from .device_manager import get_pyaudio, get_default_wasapi_loopback


class AudioCapture:
    """
    系统音频采集器。

    采集流程：
    1. start() 检测默认 WASAPI loopback 设备并打开音频流
    2. PortAudio 回调线程持续将音频块推入 ring buffer
    3. 主线程通过 read()/read_all() 非阻塞地取出音频数据
    4. stop() 停止采集并释放资源
    """

    def __init__(self, chunk_size: int = 4800):
        """
        Args:
            chunk_size: 每帧采样数。4800帧 @ 48000Hz = 100ms 延迟。
        """
        self._chunk_size = chunk_size
        self._p: pyaudio.PyAudio | None = None
        self._stream: pyaudio.Stream | None = None
        self._ring_buffer = collections.deque(maxlen=500)  # 约50秒容量
        self._running = False
        self._device_info: dict | None = None
        self._lock = threading.Lock()  # 保护 ring buffer 线程安全

    @property
    def sample_rate(self) -> int:
        """当前采集设备的采样率（默认48000Hz）。"""
        return int(self._device_info["defaultSampleRate"]) if self._device_info else 48000

    @property
    def channels(self) -> int:
        """当前采集设备的声道数（默认2，立体声）。"""
        return self._device_info["maxInputChannels"] if self._device_info else 2

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self) -> bool:
        """
        启动音频采集。

        Returns:
            True 表示采集已启动，False 表示未找到可用设备。
        """
        device = get_default_wasapi_loopback()
        if device is None:
            return False

        self._device_info = device
        self._p = get_pyaudio()

        # 打开 WASAPI loopback 流，使用 callback 模式
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
        """
        PortAudio 实时回调函数（在音频线程中执行）。

        将原始 PCM 字节转换为 float32 numpy 数组后推入 ring buffer。
        注意：回调内禁止执行耗时操作（如文件 I/O、内存分配）。
        """
        samples = np.frombuffer(in_data, dtype=np.float32).copy()
        with self._lock:
            self._ring_buffer.append(samples)
        return (in_data, pyaudio.paContinue)

    def read(self) -> np.ndarray | None:
        """非阻塞读取一个音频块。没有数据时返回 None。"""
        with self._lock:
            if self._ring_buffer:
                return self._ring_buffer.popleft()
        return None

    def read_all(self) -> np.ndarray | None:
        """非阻塞读取当前缓冲区中的所有音频数据并拼接返回。"""
        with self._lock:
            if not self._ring_buffer:
                return None
            data = np.concatenate(list(self._ring_buffer))
            self._ring_buffer.clear()
            return data

    def stop(self):
        """停止采集，关闭音频流并释放 PyAudio 资源。"""
        self._running = False
        if self._stream:
            self._stream.stop_stream()
            self._stream.close()
            self._stream = None
        if self._p:
            self._p.terminate()
            self._p = None
