"""Audio device detection and selection for WASAPI loopback capture."""
import pyaudiowpatch as pyaudio
from typing import Optional


def get_pyaudio():
    return pyaudio.PyAudio()


def get_default_wasapi_loopback() -> Optional[dict]:
    """Get the default WASAPI loopback device for system audio capture."""
    p = get_pyaudio()
    try:
        device = p.get_default_wasapi_loopback()
        return device
    except OSError:
        return None
    finally:
        p.terminate()


def list_audio_devices() -> list[dict]:
    """List all available audio input devices (including loopback)."""
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
    """Find all WASAPI loopback-capable devices."""
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
