'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { SubtitleWindow, type SubtitleItem } from './SubtitleWindow';

export function TranslatePage() {
  const bcRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    bcRef.current = new BroadcastChannel('simulagent_subtitles');
    return () => bcRef.current?.close();
  }, []);

  const [sessionActive, setSessionActive] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [audioSource, setAudioSource] = useState<'loopback' | 'microphone'>('loopback');
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [fontSize, setFontSize] = useState(18);
  const [opacity, setOpacity] = useState(0.75);
  const [asrText, setAsrText] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [latency, setLatency] = useState(0);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected': break;
      case 'session_started':
        setSessionActive(true); setSubtitles([]); setAsrText(''); setPartialTranslation('');
        break;
      case 'asr_partial':
        setAsrText(msg.text);
        break;
      case 'translation_token':
        setPartialTranslation((prev) => prev + msg.token);
        break;
      case 'translation_complete':
        setPartialTranslation('');
        setSubtitles((prev) => [...prev.slice(-49), {
          id: msg.segment_id, sequence_number: prev.length + 1,
          source_text: asrText || '', translated_text: msg.translation,
          is_revised: false, timestamp_ms: Date.now(),
        }]);
        break;
      case 'subtitle_entry': {
        const newSource = (msg.entry as any).segment_source || msg.entry.source_text || '';
        setSubtitles((prev) => {
          const last = prev[prev.length - 1];
          if (last && newSource && newSource.includes(last.source_text)) {
            return [...prev.slice(0, -1), {
              id: msg.entry.id, sequence_number: prev.length,
              source_text: newSource,
              translated_text: (msg.entry as any).segment_translation || msg.entry.translated_text || '',
              is_revised: msg.entry.is_revised || false, timestamp_ms: Date.now(),
            }];
          }
          return [...prev.slice(-9), {
            id: msg.entry.id, sequence_number: prev.length + 1,
            source_text: newSource,
            translated_text: (msg.entry as any).segment_translation || msg.entry.translated_text || '',
            is_revised: msg.entry.is_revised || false, timestamp_ms: Date.now(),
          }];
        });
        break;
      }
      case 'revision':
        setSubtitles((prev) => prev.map((s) =>
          s.id === msg.entry_id ? { ...s, translated_text: msg.new_translation, is_revised: true } : s));
        break;
      case 'session_ended': setSessionActive(false); break;
      case 'error': console.error('WS error:', msg.message); break;
    }
  }, [asrText]);

  const { connected, connect, send } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8766/ws',
    onMessage: handleMessage,
  });

  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(() => setLatency((prev) => prev + 0.1), 100);
      return () => clearInterval(interval);
    } else {
      setLatency(0);
    }
  }, [sessionActive]);

  const handleStart = useCallback(() => {
    setSubtitles([]); setAsrText(''); setPartialTranslation('');
    if (!connected) connect();
    send({ type: 'start_session', config: { source_language: sourceLanguage, target_language: 'zh', display_mode: displayMode, audio_source: audioSource } });
  }, [connected, connect, send, sourceLanguage, displayMode, audioSource]);

  const handleStop = useCallback(() => {
    send({ type: 'stop_session' }); setSessionActive(false);
  }, [send]);

  const openPopup = () => {
    const w = screen.width;
    window.open('/popup', 'simulagent-popup', `width=${w},height=160,top=${screen.height - 200},left=0,resizable=yes`);
  };

  // BroadcastChannel sync
  useEffect(() => { bcRef.current?.postMessage({ type: 'subtitles', subtitles }); }, [subtitles]);
  useEffect(() => { bcRef.current?.postMessage({ type: 'partial', source: asrText, translation: partialTranslation }); }, [asrText, partialTranslation]);
  useEffect(() => { bcRef.current?.postMessage({ type: 'settings', displayMode, fontSize, opacity }); }, [displayMode, fontSize, opacity]);

  const selectClass = "bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-sm font-medium focus:border-green-400 focus:outline-none transition-colors";
  const btnClass = "flex-1 text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-sm transition-all";

  return (
    <div className="space-y-4">
      {/* 状态栏 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">实时翻译</h2>
          <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-500">{connected ? '已连接' : '未连接'}</span>
            {sessionActive && <span className="text-xs text-gray-400">· 延迟 {latency.toFixed(1)}s</span>}
          </div>
        </div>

        {/* 设置行 */}
        {!sessionActive && (
          <div className="flex gap-2 mb-3">
            <select className={selectClass} value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
              <option value="en">English→中文</option>
              <option value="zh">中文→English</option>
              <option value="ja">日本語→中文</option>
              <option value="ko">한국어→中文</option>
            </select>
            <select className={selectClass} value={audioSource} onChange={(e) => setAudioSource(e.target.value as any)}>
              <option value="loopback">系统音频</option>
              <option value="microphone">麦克风</option>
            </select>
            <select className={selectClass} value={displayMode} onChange={(e) => setDisplayMode(e.target.value as any)}>
              <option value="bilingual">双语</option>
              <option value="chinese_only">仅中文</option>
            </select>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-3 mb-3">
          {!sessionActive ? (
            <button onClick={handleStart} className={`${btnClass} bg-green-500 hover:bg-green-600`}>开始采集</button>
          ) : (
            <>
              <button onClick={() => send({ type: 'pause_session' })} className={`${btnClass} bg-yellow-400 hover:bg-yellow-500`}>暂停</button>
              <button onClick={() => send({ type: 'resume_session' })} className={`${btnClass} bg-green-400 hover:bg-green-500`}>继续</button>
              <button onClick={handleStop} className={`${btnClass} bg-pink-400 hover:bg-pink-500`}>停止</button>
            </>
          )}
        </div>

        {!sessionActive && (
          <button onClick={openPopup} className="w-full border-2 border-dashed border-pink-300 hover:border-pink-400 text-gray-600 py-2 rounded-xl text-sm font-medium transition-all">
            启动悬浮字幕助手
          </button>
        )}
      </div>

      {/* 实时英文原文流 */}
      {asrText && sessionActive && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">实时聆听中</span>
          </div>
          <p className="text-gray-800 text-base leading-relaxed font-medium">{asrText}</p>
          {partialTranslation && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-green-600 text-sm animate-pulse">{partialTranslation}</p>
            </div>
          )}
        </div>
      )}

      {/* 实时波形示意 */}
      {sessionActive && (
        <div className="flex items-center justify-center gap-0.5 h-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse"
              style={{ height: `${20 + Math.random() * 30}px`, animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      )}

      {/* 字幕窗口 */}
      <SubtitleWindow subtitles={subtitles} displayMode={displayMode} fontSize={fontSize} opacity={opacity} />

      {/* 字幕设置 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium mb-1">字体大小</p>
            <input type="range" min={12} max={32} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-green-500" />
            <p className="text-xs text-gray-400 text-right">{fontSize}px</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium mb-1">透明度</p>
            <input type="range" min={30} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-full accent-pink-400" />
            <p className="text-xs text-gray-400 text-right">{Math.round(opacity * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
