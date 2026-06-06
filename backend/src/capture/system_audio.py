"""
音频采集器——支持系统音频（WASAPI Loopback）和麦克风双模式。

使用 PyAudioWPatch 采集音频，通过 callback 模式将音频推入线程安全的 ring buffer，
供下游 ASR 模块消费。
"""
import collections
import threading
import numpy as np
import pyaudiowpatch as pyaudio
from .device_manager import (
    get_pyaudio, get_default_wasapi_loopback, get_default_microphone
)


class AudioCapture:
    """
    音频采集器——支持双模式。

    mode="loopback": 采集系统音频输出（电脑播放的声音，如YouTube/会议）
    mode="microphone": 采集麦克风输入（外部声音，如手机外放/人声）

    采集流程：
    1. start() 检测对应设备并打开音频流
    2. PortAudio 回调线程持续将音频块推入 ring buffer
    3. 主线程通过 read()/read_all() 非阻塞地取出音频数据
    4. stop() 停止采集并释放资源
    """

    def __init__(self, chunk_size: int = 4800, device_index: int | None = None):
        """
        Args:
            chunk_size: 每帧采样数。4800帧 @ 48000Hz = 100ms。
            device_index: 指定设备编号。None=自动检测loopback。
        """
        self._chunk_size = chunk_size
        self._device_index = device_index
        self._p: pyaudio.PyAudio | None = None
        self._stream: pyaudio.Stream | None = None
        self._ring_buffer = collections.deque(maxlen=500)
        self._running = False
        self._device_info: dict | None = None
        self._lock = threading.Lock()

    @property
    def sample_rate(self) -> int:
        """当前采集设备的采样率。"""
        return int(self._device_info["defaultSampleRate"]) if self._device_info else 48000

    @property
    def channels(self) -> int:
        """当前采集设备的声道数。"""
        return self._device_info["maxInputChannels"] if self._device_info else 1

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self) -> bool:
        """
        启动音频采集。

        Returns:
            True 表示采集已启动，False 表示未找到可用设备。
        """
        # 指定设备编号或自动检测
        if self._device_index is not None:
            p = get_pyaudio()
            device = p.get_device_info_by_index(self._device_index)
            p.terminate()
        else:
            device = get_default_wasapi_loopback()
            if device is None:
                device = get_default_microphone()

        if device is None:
            print(f"[capture] no device found for mode={self._mode}")
            return False

        self._device_info = device
        self._p = get_pyaudio()
        channels = min(device["maxInputChannels"], 2)  # 最多2声道

        print(f"[capture] device={device['name'][:40]}, "
              f"rate={int(device['defaultSampleRate'])}, ch={channels}")

        self._stream = self._p.open(
            format=pyaudio.paFloat32,
            channels=channels,
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
