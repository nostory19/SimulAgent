/**
 * TTS 语音合成播放工具
 *
 * 调用后端 /api/v1/tts 接口获取 PCM16 音频，通过 Web Audio API 播放。
 * 支持播放缓存和悬停预取，提升用户体验。
 */

// 复用单个 AudioContext（浏览器限制同时创建的数量）
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentResolve: (() => void) | null = null;

// TTS 音频缓存：key = `${text}||${voice}`，value = PCM16 ArrayBuffer
const ttsCache = new Map<string, ArrayBuffer>();
const CACHE_MAX = 50; // 最多缓存 50 条

function cacheKey(text: string, voice: string): string {
  return `${text}||${voice}`;
}

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
 * 从后端获取 TTS 音频（带缓存）。
 * 命中缓存直接返回，否则请求后端并缓存结果。
 */
async function fetchTtsAudio(text: string, voice: string): Promise<ArrayBuffer> {
  const key = cacheKey(text, voice);
  const cached = ttsCache.get(key);
  if (cached) return cached;

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

  // 缓存（LRU 淘汰最旧的）
  if (ttsCache.size >= CACHE_MAX) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey) ttsCache.delete(firstKey);
  }
  ttsCache.set(key, buffer);

  return buffer;
}

/**
 * 预取 TTS 音频到缓存（不播放）。
 * 用于鼠标悬停时后台加载，点击时即可秒播。
 */
export function prefetchTts(text: string, voice: string = '茉莉'): void {
  if (!text.trim()) return;
  const key = cacheKey(text, voice);
  if (ttsCache.has(key)) return; // 已缓存
  // 静默预取，失败忽略
  fetchTtsAudio(text, voice).catch(() => {});
}

/**
 * 检查音频是否已缓存。
 */
export function isTtsCached(text: string, voice: string = '茉莉'): boolean {
  return ttsCache.has(cacheKey(text, voice));
}

/**
 * 请求后端 TTS 接口合成语音并播放（优先使用缓存）。
 * @param text 要合成的文本
 * @param voice 预置音色 ID（默认 "冰糖"）
 */
export async function speak(text: string, voice: string = '茉莉'): Promise<void> {
  const buffer = await fetchTtsAudio(text, voice);
  await playPcmAudio(buffer);
}
