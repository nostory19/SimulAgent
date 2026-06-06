'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ServerMessage, SessionSummary } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { SubtitleWindow, type SubtitleItem } from './SubtitleWindow';
import { SettingsPanel } from './SettingsPanel';
import { SessionHistory } from './SessionHistory';
import { SummaryView } from './SummaryView';

export function ControlPanel() {
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
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected': break;
      case 'session_started':
        setSessionActive(true); setSubtitles([]); setAsrText('');
        setSummary(null); setCurrentSessionId(msg.session?.id || null);
        break;
      case 'asr_partial': setAsrText(msg.text); break;
      case 'asr_final': setAsrText(''); break;
      case 'translation_token': setPartialTranslation((prev) => prev + msg.token); break;
      case 'translation_complete':
        setPartialTranslation('');
        setSubtitles((prev) => [...prev.slice(-49), {
          id: msg.segment_id, sequence_number: prev.length + 1,
          source_text: asrText || '', translated_text: msg.translation,
          is_revised: false, timestamp_ms: Date.now(),
        }]);
        break;
      case 'subtitle_entry':
      {
        const newSource = (msg.entry as any).segment_source || msg.entry.source_text || '';
        // 去重：如果新条目的原文包含上一条的原文，替换上一条（云端模式正常行为）
        setSubtitles((prev) => {
          const last = prev[prev.length - 1];
          if (last && newSource && newSource.includes(last.source_text)) {
            // 替换最后一条（新翻译更完整）
            const updated = [...prev.slice(0, -1), {
              id: msg.entry.id,
              sequence_number: prev.length,
              source_text: newSource,
              translated_text: (msg.entry as any).segment_translation || msg.entry.translated_text || '',
              is_revised: msg.entry.is_revised || false,
              timestamp_ms: Date.now(),
            }];
            return updated;
          }
          return [...prev.slice(-9), {
            id: msg.entry.id, sequence_number: prev.length + 1,
            source_text: (msg.entry as any).segment_source || msg.entry.source_text || '',
            translated_text: (msg.entry as any).segment_translation || msg.entry.translated_text || '',
            is_revised: msg.entry.is_revised || false, timestamp_ms: Date.now(),
          }]);
        });
      }
      break;
      case 'revision':
        setSubtitles((prev) => prev.map((s) =>
          s.id === msg.entry_id ? { ...s, translated_text: msg.new_translation, is_revised: true } : s));
        break;
      case 'session_ended':
        setSessionActive(false); setHistoryRefresh((n) => n + 1);
        break;
      case 'error': console.error('WS error:', msg.message); break;
    }
  }, [asrText]);

  const { connected, connect, disconnect, send } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8766/ws',
    onMessage: handleMessage,
  });

  const handleStart = useCallback(() => {
    // 新会话前立即清屏，避免上次残留
    setSubtitles([]); setAsrText(''); setPartialTranslation('');
    setSummary(null); setCurrentSessionId(null);
    if (!connected) connect();
    send({ type: 'start_session', config: { source_language: sourceLanguage, target_language: 'zh', display_mode: displayMode, audio_source: audioSource } });
  }, [connected, connect, send, sourceLanguage, displayMode, audioSource]);

  const handleStop = useCallback(() => {
    send({ type: 'stop_session' });
    setSessionActive(false);
    // 保留当前 subtitles 和 currentSessionId，供查看和生成总结
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
  const btnPrimary = "flex-1 text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-sm transition-all";
  const cardClass = "bg-white rounded-2xl p-4 shadow-sm border border-gray-100";

  return (
    <div className="p-4 space-y-4 max-w-[480px] mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">SimulAgent</h2>
          <p className="text-gray-400 text-xs">实时同声传译助手</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500 font-medium">{connected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {/* Settings */}
      {!sessionActive && (
        <div className={cardClass}>
          <div className="flex gap-2 flex-wrap">
            <select className={selectClass} value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
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
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!sessionActive ? (
          <button onClick={handleStart} className={`${btnPrimary} bg-green-500 hover:bg-green-600 text-white`}>
            开始采集
          </button>
        ) : (
          <>
            <button onClick={() => send({ type: 'pause_session' })} className={`${btnPrimary} bg-yellow-400 hover:bg-yellow-500 text-white`}>暂停</button>
            <button onClick={() => send({ type: 'resume_session' })} className={`${btnPrimary} bg-green-400 hover:bg-green-500 text-white`}>继续</button>
            <button onClick={handleStop} className={`${btnPrimary} bg-pink-400 hover:bg-pink-500 text-white`}>停止</button>
          </>
        )}
      </div>

      {/* 实时原文流式展示（英文，即时更新） */}
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

      {/* Popup button */}
      <button onClick={openPopup}
        className="w-full bg-white hover:bg-gray-50 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium border-2 border-dashed border-pink-300 hover:border-pink-400 transition-all">
        打开浮动字幕窗口
      </button>

      {/* Subtitle window */}
      <SubtitleWindow subtitles={subtitles} displayMode={displayMode} fontSize={fontSize} opacity={opacity} />

      {/* Settings panel */}
      <SettingsPanel displayMode={displayMode} onDisplayModeChange={setDisplayMode}
        fontSize={fontSize} onFontSizeChange={setFontSize}
        opacity={opacity} onOpacityChange={setOpacity} />

      {/* Summary */}
      {currentSessionId && (
        <div className={cardClass}>
          <SummaryView summary={summary} loading={summaryLoading}
            sessionEnded={!sessionActive && !!currentSessionId}
            sessionId={currentSessionId}
            onGenerate={async () => {
              setSummaryLoading(true);
              try {
                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';
                const res = await fetch(`${base}/api/v1/sessions/${currentSessionId}/summary`, { method: 'POST' });
                if (res.ok) setSummary(await res.json());
              } catch (e) { console.error(e); }
              finally { setSummaryLoading(false); }
            }}
          />
        </div>
      )}

      {/* History */}
      <div className={cardClass}>
        <SessionHistory refreshTrigger={historyRefresh} />
      </div>
    </div>
  );
}
