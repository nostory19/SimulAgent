"""TTS 语音合成 API——调用 MiMo-V2.5-TTS，返回 PCM 音频流。"""
import os
import base64
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/api/v1/tts", tags=["tts"])

# MiMo TTS API 配置
MIMO_BASE_URL = "https://api.xiaomimimo.com/v1/chat/completions"
MIMO_MODEL = "mimo-v2.5-tts"

# 预置音色列表（供前端引用）
VOICES = [
    {"id": "冰糖", "name": "冰糖", "language": "zh", "gender": "female"},
    {"id": "茉莉", "name": "茉莉", "language": "zh", "gender": "female"},
    {"id": "苏打", "name": "苏打", "language": "zh", "gender": "male"},
    {"id": "白桦", "name": "白桦", "language": "zh", "gender": "male"},
    {"id": "Mia", "name": "Mia", "language": "en", "gender": "female"},
    {"id": "Chloe", "name": "Chloe", "language": "en", "gender": "female"},
    {"id": "Milo", "name": "Milo", "language": "en", "gender": "male"},
    {"id": "Dean", "name": "Dean", "language": "en", "gender": "male"},
]


class TTSRequest(BaseModel):
    """TTS 请求体。"""
    text: str
    voice: str = "冰糖"


@router.get("/voices")
async def list_voices():
    """返回可用的预置音色列表。"""
    return {"voices": VOICES}


@router.post("")
async def synthesize_speech(req: TTSRequest):
    """调用 MiMo TTS API 合成语音，返回原始 PCM16 音频数据。"""
    api_key = os.getenv("MIMO_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="MIMO_API_KEY 未配置")

    if not req.text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")

    # 构建 MiMo TTS 请求
    payload = {
        "model": MIMO_MODEL,
        "messages": [
            {
                "role": "assistant",
                "content": req.text,
            }
        ],
        "audio": {
            "format": "pcm16",
            "voice": req.voice,
        },
        "stream": True,
    }

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
    }

    # 调用 MiMo API，收集所有音频 chunk
    pcm_chunks: list[bytes] = []
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", MIMO_BASE_URL, json=payload, headers=headers) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"MiMo API 错误: {error_body.decode('utf-8', errors='replace')[:200]}",
                    )

                # 解析 SSE 流，提取音频数据
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]  # 去掉 "data: " 前缀
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        choices = chunk.get("choices", [])
                        if not choices:
                            continue
                        delta = choices[0].get("delta", {})
                        audio = delta.get("audio")
                        if audio and isinstance(audio, dict) and "data" in audio:
                            pcm_bytes = base64.b64decode(audio["data"])
                            pcm_chunks.append(pcm_bytes)
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="MiMo API 请求超时")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS 合成失败: {str(e)}")

    if not pcm_chunks:
        raise HTTPException(status_code=500, detail="MiMo API 未返回音频数据")

    # 拼接所有 PCM chunk 返回
    pcm_data = b"".join(pcm_chunks)
    return Response(content=pcm_data, media_type="audio/pcm")
