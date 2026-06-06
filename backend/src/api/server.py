"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ..config import settings

app = FastAPI(
    title="SimulAgent",
    version="0.1.0",
    description="Real-time simultaneous interpretation backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/v1/system/audio-devices")
async def list_audio_devices():
    try:
        import pyaudiowpatch as pyaudio
        p = pyaudio.PyAudio()
        devices = []
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            if info["maxInputChannels"] > 0:
                devices.append({
                    "name": info["name"],
                    "index": i,
                    "max_input_channels": info["maxInputChannels"],
                    "host_api": p.get_host_api_info_by_index(info["hostApi"])["name"],
                })
        p.terminate()
        return {"default_loopback": None, "all_devices": devices}
    except Exception:
        return {"all_devices": []}
