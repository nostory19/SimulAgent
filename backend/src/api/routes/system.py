"""
系统工具 API 路由。

提供音频设备列表、健康检查等系统级端点。
"""
from fastapi import APIRouter
from ...capture.device_manager import list_audio_devices, find_loopback_devices

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/audio-devices")
async def get_audio_devices():
    """
    获取所有可用音频设备列表。

    返回：
    - all_devices: 所有输入设备（麦克风等）
    - loopback_devices: WASAPI loopback 设备（用于采集系统音频）
    - default_loopback: 默认 loopback 设备（推荐使用）
    """
    try:
        devices = list_audio_devices()
        loopback = find_loopback_devices()
        return {
            "default_loopback": loopback[0] if loopback else None,
            "all_devices": devices,
            "loopback_devices": loopback,
        }
    except Exception:
        return {"all_devices": []}
