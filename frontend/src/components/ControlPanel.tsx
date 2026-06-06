'use client';

import { useState, useCallback } from 'react';
import type { ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

export function ControlPanel() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [asrText, setAsrText] = useState('');
  const [segments, setSegments] = useState<Array<{ seq: number; text: string }>>([]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected':
        break;
      case 'session_started':
        setSessionActive(true);
        setSegments([]);
        setAsrText('');
        break;
      case 'asr_partial':
        setAsrText(msg.text);
        setSegments((prev) => [...prev.slice(-49), { seq: msg.sequence_number, text: msg.text }]);
        break;
      case 'asr_final':
        setSegments((prev) => [...prev.slice(-49), { seq: msg.sequence_number ?? 0, text: msg.text }]);
        setAsrText('');
        break;
      case 'session_ended':
        setSessionActive(false);
        break;
      case 'error':
        console.error('WS error:', msg.message);
        break;
    }
  }, []);

  const { connected, connect, disconnect, send } = useWebSocket({
    url: 'ws://localhost:8765/ws',
    onMessage: handleMessage,
  });

  const handleStart = useCallback(() => {
    if (!connected) connect();
    send({
      type: 'start_session',
      config: { source_language: sourceLanguage, target_language: 'zh', display_mode: displayMode },
    });
  }, [connected, connect, send, sourceLanguage, displayMode]);

  const handleStop = useCallback(() => {
    send({ type: 'stop_session' });
    setSessionActive(false);
  }, [send]);

  const handlePause = useCallback(() => {
    send({ type: 'pause_session' });
  }, [send]);

  const handleResume = useCallback(() => {
    send({ type: 'resume_session' });
  }, [send]);

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white rounded-lg min-w-[320px]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">SimulAgent</h2>
        <span className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-400">
          源语言
          <select
            className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
        </label>

        <label className="block text-sm text-gray-400">
          显示模式
          <select
            className="ml-2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'bilingual' | 'chinese_only')}
          >
            <option value="bilingual">双语</option>
            <option value="chinese_only">仅中文</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        {!sessionActive ? (
          <button
            onClick={handleStart}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium"
          >
            开始采集
          </button>
        ) : (
          <>
            <button
              onClick={handlePause}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded font-medium"
            >
              暂停
            </button>
            <button
              onClick={handleResume}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium"
            >
              继续
            </button>
            <button
              onClick={handleStop}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-medium"
            >
              停止
            </button>
          </>
        )}
      </div>

      {/* Live ASR preview */}
      <div className="bg-gray-800 rounded p-3 min-h-[100px] max-h-[300px] overflow-y-auto">
        {asrText ? (
          <p className="text-green-400 text-sm animate-pulse">{asrText}</p>
        ) : (
          <p className="text-gray-600 text-sm">等待语音输入...</p>
        )}
        <div className="mt-2 space-y-1">
          {segments.slice(-10).map((seg) => (
            <p key={seg.seq} className="text-gray-300 text-xs border-b border-gray-700 pb-1">
              {seg.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
