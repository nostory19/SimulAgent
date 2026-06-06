'use client';

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

  const start = useCallback(async () => {
    try {
      setState('capturing');
      setError(null);

      // Request system audio via getUserMedia (for mic) or getDisplayMedia (for tab/system audio)
      // Note: System-wide audio capture requires Electron WASAPI or desktop-side support.
      // In Electron, this would use IPC to the main process which handles PyAudioWPatch.
      // For browser-only mode, we use getDisplayMedia with audio capture.
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const buffer = new Float32Array(input);
        onAudioData?.(buffer.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (e: any) {
      setState('error');
      setError(e.message || 'Audio capture failed');
      onError?.(e.message);
    }
  }, [onAudioData, onError]);

  const pause = useCallback(() => {
    // Suspend audio context
    audioContextRef.current?.suspend();
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    audioContextRef.current?.resume();
    setState('capturing');
  }, []);

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
