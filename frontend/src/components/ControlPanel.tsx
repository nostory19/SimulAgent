'use client';

/**
 * SimulAgent 主控制面板组件。
 *
 * 整合所有功能：
 * - 会话控制（开始/暂停/继续/停止）
 * - 实时 ASR + 翻译字幕展示（SubtitleWindow）
 * - 显示设置（SettingsPanel）
 * - 历史会话（SessionHistory）
 * - WebSocket 消息路由分发
 */
import { useState, useCallback } from 'react';
import type { ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { SubtitleWindow, type SubtitleItem } from './SubtitleWindow';
import { SettingsPanel } from './SettingsPanel';
import { SessionHistory } from './SessionHistory';

export function ControlPanel() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [fontSize, setFontSize] = useState(18);
  const [opacity, setOpacity] = useState(0.85);
  const [asrText, setAsrText] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  /** 处理服务端所有 WebSocket 消息 */
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected':
        break;
      case 'session_started':
        setSessionActive(true);
        setSubtitles([]);
        setAsrText('');
        break;
      case 'asr_partial':
        setAsrText(msg.text);
        break;
      case 'asr_final':
        setAsrText('');
        break;
      // 翻译完成 → 添加到字幕列表
      case 'translation_complete':
        setSubtitles((prev) => [
          ...prev.slice(-99),  // 保留最近 100 条
          {
            id: msg.segment_id,
            sequence_number: prev.length + 1,
            source_text: asrText || '',
            translated_text: msg.translation,
            is_revised: false,
            timestamp_ms: Date.now(),
          },
        ]);
        break;
      // 字幕条目确认
      case 'subtitle_entry':
        break;
      // 修正字幕 → 更新已有条目
      case 'revision':
        setSubtitles((prev) =>
          prev.map((s) =>
            s.id === msg.entry_id
              ? { ...s, translated_text: msg.new_translation, is_revised: true }
              : s
          )
        );
        break;
      case 'session_ended':
        setSessionActive(false);
        setHistoryRefresh((n) => n + 1);  // 刷新历史列表
        break;
      case 'error':
        console.error('WS error:', msg.message);
        break;
    }
  }, [asrText]);

  const { connected, connect, disconnect, send } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws',
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

  return (
    <div className="p-3 space-y-3 bg-gray-900 text-white min-w-[360px] max-w-[480px]">
      {/* 状态栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">SimulAgent</h2>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">{connected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {/* 设置下拉：源语言 + 显示模式 */}
      {!sessionActive && (
        <div className="flex gap-2">
          <select
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            <option value="en">English (英文)</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
          </select>
          <select
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'bilingual' | 'chinese_only')}
          >
            <option value="bilingual">双语</option>
            <option value="chinese_only">仅中文</option>
          </select>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex gap-2">
        {!sessionActive ? (
          <button
            onClick={handleStart}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded text-sm font-medium"
          >
            开始采集
          </button>
        ) : (
          <>
            <button onClick={() => send({ type: 'pause_session' })}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1.5 px-2 rounded text-sm">
              暂停
            </button>
            <button onClick={() => send({ type: 'resume_session' })}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-sm">
              继续
            </button>
            <button onClick={handleStop}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 px-2 rounded text-sm">
              停止
            </button>
          </>
        )}
      </div>

      {/* 实时字幕窗口 */}
      <SubtitleWindow
        subtitles={subtitles}
        displayMode={displayMode}
        fontSize={fontSize}
        opacity={opacity}
      />

      {/* 设置面板 */}
      <SettingsPanel
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        opacity={opacity}
        onOpacityChange={setOpacity}
      />

      {/* 历史会话 */}
      <SessionHistory refreshTrigger={historyRefresh} />
    </div>
  );
}
