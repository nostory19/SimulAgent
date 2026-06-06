"""
音频设备管理器。

通过 PyAudioWPatch 枚举系统中的音频输入设备和 WASAPI loopback 设备，
用于自动检测和选择系统音频采集设备。
"""
import pyaudiowpatch as pyaudio
from typing import Optional


def get_pyaudio():
    """创建并返回 PyAudio 实例（每次调用需手动 terminate）。"""
    return pyaudio.PyAudio()


def get_default_wasapi_loopback() -> Optional[dict]:
    """
    获取系统默认的 WASAPI loopback 设备信息。

    WASAPI loopback 将扬声器/耳机输出的音频镜像为一个虚拟输入设备，
    从而实现「采集系统正在播放的声音」。

    Returns:
        设备信息字典（含 name, index, maxInputChannels, defaultSampleRate），
        如果未找到则返回 None。
    """
    p = get_pyaudio()
    try:
        device = p.get_default_wasapi_loopback()
        return device
    except OSError:
        return None
    finally:
        p.terminate()


def list_audio_devices() -> list[dict]:
    """枚举所有可用的音频输入设备（麦克风 + loopback 等）。"""
    p = get_pyaudio()
    devices = []
    try:
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            if info["maxInputChannels"] > 0:
                devices.append({
                    "name": info["name"],
                    "index": i,
                    "max_input_channels": info["maxInputChannels"],
                    "default_sample_rate": int(info["defaultSampleRate"]),
                    "host_api": p.get_host_api_info_by_index(info["hostApi"])["name"],
                })
    finally:
        p.terminate()
    return devices


def find_loopback_devices() -> list[dict]:
    """筛选出所有 WASAPI loopback 类型的设备（用于采集系统音频）。"""
    p = get_pyaudio()
    devices = []
    try:
        for device in p.get_loopback_device_info_generator():
            devices.append({
                "name": device["name"],
                "index": device["index"],
                "max_input_channels": device["maxInputChannels"],
                "default_sample_rate": int(device["defaultSampleRate"]),
            })
    finally:
        p.terminate()
    return devices


def get_default_microphone() -> dict | None:
    """
    获取系统默认麦克风输入设备。

    遍历所有非loopback输入设备，返回第一个可用的麦克风。
    """
    p = get_pyaudio()
    try:
        default_input = p.get_default_input_device_info()
        return default_input
    except Exception:
        # fallback: 手动查找第一个麦克风
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            name = info["name"].lower()
            if (info["maxInputChannels"] > 0
                    and "loopback" not in name
                    and "output" not in name):
                return info
        return None
    finally:
        p.terminate()
