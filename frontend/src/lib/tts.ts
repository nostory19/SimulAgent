/**
 * TTS 语音合成播放工具
 *
 * 调用后端 /api/v1/tts 接口获取 PCM16 音频，通过 Web Audio API 播放。
 */

// 复用单个 AudioContext（浏览器限制同时创建的数量）
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentResolve: (() => void) | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext({ sampleRate: 24000 });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** 停止当前正在播放的音频 */
export function stopPlayback(): void {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
  if (currentResolve) {
    currentResolve();
    currentResolve = null;
  }
}

/**
 * 将 PCM16 原始字节解码并通过 Web Audio API 播放。
 * 返回 Promise，在播放结束或被 stop 时 resolve。
 */
export function playPcmAudio(pcmBuffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 停止之前的播放
      stopPlayback();

      const ctx = getAudioContext();
      const pcm16 = new Int16Array(pcmBuffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      currentSource = source;
      currentResolve = resolve;

      source.onended = () => {
        currentSource = null;
        currentResolve = null;
        resolve();
      };

      source.start();
    } catch (e) {
      currentSource = null;
      currentResolve = null;
      reject(e);
    }
  });
}

/**
 * 请求后端 TTS 接口合成语音并播放。
 * @param text 要合成的文本
 * @param voice 预置音色 ID（默认 "冰糖"）
 */
export async function speak(text: string, voice: string = '冰糖'): Promise<void> {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';
  const res = await fetch(`${API}/api/v1/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`TTS 请求失败 (${res.status}): ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  await playPcmAudio(buffer);
}
