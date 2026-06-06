"""System utility API routes."""
from fastapi import APIRouter
from ...capture.device_manager import list_audio_devices, find_loopback_devices

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/audio-devices")
async def get_audio_devices():
    """List all available audio input devices and loopback devices."""
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
