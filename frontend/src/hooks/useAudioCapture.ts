'use client';

/**
 * 音频采集 Hook
 *
 * 管理浏览器端音频采集状态机：
 * idle → capturing → paused → capturing → ...
 *         ↘ error
 *
 * 通过 getDisplayMedia 采集浏览器标签页/系统音频，
 * 使用 AudioContext + ScriptProcessorNode 将原始 PCM 数据通过回调传出。
 *
 * 注意：完整的系统级音频采集需要 Electron + 后端 WASAPI loopback。
 *       浏览器端仅支持 getDisplayMedia 的标签页音频共享。
 */
import { useState, useCallback, useRef } from 'react';

type CaptureState = 'idle' | 'capturing' | 'paused' | 'error';

interface UseAudioCaptureOptions {
  onAudioData?: (chunk: ArrayBuffer) => void;
  onError?: (error: string) => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const { onAudioData, onError } = options;
  const [state, setState] = useState<CaptureState>('idle');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  /** 开始采集音频 */
  const start = useCallback(async () => {
    try {
      setState('capturing');
      setError(null);

      // 请求媒体流（标签页/窗口的系统音频共享）
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      // 创建 AudioContext 用于处理原始音频
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 每次音频回调时提取 PCM 数据
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const buffer = new Float32Array(input);
        onAudioData?.(buffer.buffer);  // 将 ArrayBuffer 传给外部（通常是 WebSocket sendBinary）
      };

      // 连接音频处理链
      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (e: any) {
      setState('error');
      setError(e.message || 'Audio capture failed');
      onError?.(e.message);
    }
  }, [onAudioData, onError]);

  /** 暂停采集（挂起 AudioContext） */
  const pause = useCallback(() => {
    audioContextRef.current?.suspend();
    setState('paused');
  }, []);

  /** 恢复采集 */
  const resume = useCallback(() => {
    audioContextRef.current?.resume();
    setState('capturing');
  }, []);

  /** 停止采集并释放所有资源 */
  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    streamRef.current = null;
    audioContextRef.current = null;
    processorRef.current = null;
    setState('idle');
  }, []);

  return { state, error, start, pause, resume, stop };
}
