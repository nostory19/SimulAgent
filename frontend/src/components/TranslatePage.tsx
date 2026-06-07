'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ServerMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { SubtitleWindow, type SubtitleItem } from './SubtitleWindow';
import { LangSelect } from './LangSelect';

interface AudioDevice { name: string; index: number; max_input_channels: number; host_api?: string; }
interface DeviceGroup { label: string; devices: AudioDevice[]; }

export function TranslatePage() {
  const bcRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => { bcRef.current = new BroadcastChannel('simulagent_subtitles'); return () => bcRef.current?.close(); }, []);

  const [sessionActive, setSessionActive] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('zh');
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number>(-1);
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [fontSize, setFontSize] = useState(18);
  const [opacity, setOpacity] = useState(0.75);
  const [asrText, setAsrText] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [fullTranscript, setFullTranscript] = useState('');  // 全量累积译文
  const [showTranscript, setShowTranscript] = useState(false);
  const [latency, setLatency] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'connected': break;
      case 'session_started': setSessionActive(true); setSubtitles([]); setAsrText(''); setPartialTranslation(''); break;
      case 'asr_partial':
        // 新句子开始：英文不包含上句 → 清空旧翻译避免残留
        if (msg.text && asrText && !msg.text.includes(asrText.trim())) {
          setPartialTranslation('');
        }
        setAsrText(msg.text);
        break;
      case 'translation_token': setPartialTranslation(prev => prev + msg.token); break;
      case 'translation_complete':
        setPartialTranslation('');
        setSubtitles(prev => [...prev.slice(-49), { id: msg.segment_id, sequence_number: prev.length + 1, source_text: asrText || '', translated_text: msg.translation, is_revised: false, timestamp_ms: Date.now() }]);
        break;
      case 'subtitle_entry': {
        const newSource = (msg.entry as any).segment_source || msg.entry.source_text || '';
        // 记录全量累积译文
        if ((msg.entry as any).translated_text) setFullTranscript((msg.entry as any).translated_text);
        setSubtitles(prev => {
          const last = prev[prev.length - 1];
          if (last && newSource && newSource.includes(last.source_text)) {
            return [...prev.slice(0, -1), { id: msg.entry.id, sequence_number: prev.length, source_text: newSource, translated_text: (msg.entry as any).segment_translation || msg.entry.translated_text || '', is_revised: msg.entry.is_revised || false, timestamp_ms: Date.now() }];
          }
          return [...prev.slice(-9), { id: msg.entry.id, sequence_number: prev.length + 1, source_text: newSource, translated_text: (msg.entry as any).segment_translation || msg.entry.translated_text || '', is_revised: msg.entry.is_revised || false, timestamp_ms: Date.now() }];
        });
        break;
      }
      case 'revision': setSubtitles(prev => prev.map(s => s.id === msg.entry_id ? { ...s, translated_text: msg.new_translation, is_revised: true } : s)); break;
      case 'session_ended': setSessionActive(false); break;
      case 'error': console.error('WS error:', msg.message); break;
    }
  }, [asrText]);

  const { connected, connect, send } = useWebSocket({ url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8766/ws', onMessage: handleMessage });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766'}/api/v1/system/audio-devices`)
      .then(r => r.json()).then(data => {
        const groups: DeviceGroup[] = [];
        const loopbacks = (data.loopback_devices || []) as AudioDevice[];
        if (loopbacks.length > 0) groups.push({ label: '扬声器', devices: loopbacks });
        const mics = (data.all_devices || []).filter((d: AudioDevice) => !d.name.toLowerCase().includes('loopback') && d.max_input_channels > 0);
        if (mics.length > 0) groups.push({ label: '麦克风', devices: mics });
        setDeviceGroups(groups);
        if (loopbacks.length > 0 && selectedDevice < 0) setSelectedDevice(loopbacks[0].index);
      }).catch(() => {});
  }, []);

  useEffect(() => { if (!sessionActive) { setLatency(0); return; } const iv = setInterval(() => setLatency(prev => +(prev + 0.1).toFixed(1)), 100); return () => clearInterval(iv); }, [sessionActive]);

  const handleStart = useCallback(() => {
    setSubtitles([]); setAsrText(''); setPartialTranslation(''); if (!connected) connect();
    send({ type: 'start_session', config: { source_language: sourceLanguage, target_language: targetLanguage, display_mode: displayMode, device_index: selectedDevice } });
  }, [connected, connect, send, sourceLanguage, targetLanguage, displayMode, selectedDevice]);

  const handleStop = useCallback(() => { send({ type: 'stop_session' }); setSessionActive(false); }, [send]);
  const pipWindowRef = useRef<any>(null);

  const openPopup = async () => {
    // 优先使用 Document PiP API（Chrome 116+）
    if ('documentPictureInPicture' in window) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 420, height: 320,
        });
        pipWindowRef.current = pipWin;

        // 注入样式 + HTML——影院级字幕排版
        const style = pipWin.document.createElement('style');
        style.textContent = `
          *{margin:0;padding:0;box-sizing:border-box}
          body{background:linear-gradient(180deg,rgba(8,8,10,.78) 0%,rgba(16,16,18,.72) 100%);
               color:#e8d59c;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
               overflow:hidden;user-select:none;-webkit-font-smoothing:antialiased;
               -moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
          #container{height:100vh;overflow-y:auto;padding:18px 20px;scroll-behavior:smooth}
          .line{margin-bottom:14px;transition:opacity .4s ease;position:relative}
          .line+.line{padding-top:12px;border-top:1px solid rgba(255,255,255,.04)}
          .src{color:rgba(255,255,255,.32);font-size:13px;font-weight:400;line-height:1.55;
               letter-spacing:.01em;margin-bottom:2px;font-style:italic}
          .tgt{font-size:20px;font-weight:500;line-height:1.6;letter-spacing:.02em;
               text-shadow:0 1px 2px rgba(0,0,0,.5)}
          .revised{color:#e8bcc4}
          .partial-src{color:rgba(255,255,255,.28);font-size:13px;line-height:1.55;
                       letter-spacing:.01em;margin-bottom:2px;font-style:italic}
          .partial-tgt{font-size:18px;font-weight:500;color:rgba(255,255,255,.06);line-height:1.6}
          .partial-tgt.has{color:#e8d59c}
          .cursor{display:inline-block;width:2px;height:1.1em;vertical-align:text-bottom;
                  margin-left:3px;background:#e8d59c;border-radius:1px;
                  animation:cursorBlink 1s steps(2) infinite}
          .dot{display:inline-block;width:3px;height:3px;border-radius:50%;
               background:rgba(255,255,255,.2);margin:0 2px;animation:dotBounce 1.4s infinite}
          .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
          @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
          @keyframes dotBounce{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:.6;transform:translateY(-3px)}}
          @keyframes fadeIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
        `;
        pipWin.document.head.appendChild(style);

        const container = pipWin.document.createElement('div');
        container.id = 'container';
        pipWin.document.body.appendChild(container);

        // 通过 BroadcastChannel 接收字幕数据
        const bc = new BroadcastChannel('simulagent_subtitles');
        let lines: any[] = [];
        let partialSrc = '', partialTgt = '';
        let mode = 'bilingual';

        const render = () => {
          const recent = lines.slice(-20);
          const lastLine = recent[recent.length - 1];
          // 流式预览如果与最后确认行完全相同则跳过（避免重复）
          const partialDuplicate = lastLine && partialSrc === lastLine.source && partialTgt === lastLine.translation;
          const showPartial = (partialSrc || partialTgt) && !partialDuplicate;

          container.innerHTML = recent.map((l: any, i: number) => {
            return `<div class="line" style="opacity:1">
              ${mode === 'bilingual' && l.source ? `<div class="src">${l.source}</div>` : ''}
              <div class="tgt${l.is_revised ? ' revised' : ''}">${l.translation}</div>
            </div>`;
          }).join('') + (showPartial ? `<div class="line">
            ${mode === 'bilingual' && partialSrc ? `<div class="partial-src">${partialSrc}</div>` : ''}
            <div class="partial-tgt${partialTgt ? ' has' : ''}">
              ${partialTgt || '<span class="dot"></span><span class="dot"></span><span class="dot"></span>'}
              ${partialTgt ? '<span class="cursor"></span>' : ''}
            </div>
          </div>` : '');

          requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        };

        bc.onmessage = (e: any) => {
          const d = e.data;
          if (d.type === 'subtitles') {
            lines = (d.subtitles || []).map((s: any) => ({
              id: s.id, source: s.source_text || '', translation: s.translated_text || '', is_revised: s.is_revised || false,
            }));
          } else if (d.type === 'partial') {
            partialSrc = d.source || ''; partialTgt = d.translation || '';
          } else if (d.type === 'settings' && d.displayMode) {
            mode = d.displayMode;
          }
          render();
        };
        render();

        // PiP 窗口关闭时清理
        pipWin.addEventListener('pagehide', () => {
          bc.close();
          pipWindowRef.current = null;
        });
        return;
      } catch (e) {
        console.log('Document PiP not available, fallback to popup');
      }
    }
    // 降级方案：window.open
    const w = 400, h = 280;
    window.open('/popup', 'simulagent-pip',
      `width=${w},height=${h},top=${screen.height - h - 80},left=${screen.width - w - 40},resizable=yes,alwaysOnTop=yes,toolbar=no,menubar=no,location=no,status=no,scrollbars=no`);
  };

  useEffect(() => { bcRef.current?.postMessage({ type: 'subtitles', subtitles }); }, [subtitles]);
  useEffect(() => { bcRef.current?.postMessage({ type: 'partial', source: asrText, translation: partialTranslation }); }, [asrText, partialTranslation]);
  useEffect(() => { bcRef.current?.postMessage({ type: 'settings', displayMode, fontSize, opacity }); }, [displayMode, fontSize, opacity]);

  // === RENDER ===
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* === Top: Compact toolbar === */}
      <div className="flex items-center gap-3 pb-4">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <LangSelect value={sourceLanguage} onChange={setSourceLanguage} />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>→</span>
          <LangSelect value={targetLanguage} onChange={setTargetLanguage} />
          {!sessionActive && deviceGroups.length > 0 && (
            <select className="rounded-md px-2.5 py-2 text-xs font-medium focus:outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: 'none', maxWidth: 180 }}
              value={selectedDevice} onChange={e => setSelectedDevice(Number(e.target.value))}>
              {deviceGroups.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.devices.map(d => <option key={d.index} value={d.index}>{d.name}</option>)}
                </optgroup>
              ))}
            </select>
          )}
          {!sessionActive && (
            <select className="rounded-md px-2.5 py-2 text-xs font-medium focus:outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: 'none' }}
              value={displayMode} onChange={e => setDisplayMode(e.target.value as any)}>
              <option value="bilingual">双语</option>
              <option value="chinese_only">仅译文</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {sessionActive && <span style={{ color: 'var(--accent-text)' }}>{latency}s</span>}
          <span className="w-2 h-2 rounded-full" style={{ background: connected ? 'var(--accent)' : 'var(--danger)' }} />
          {connected ? '已连接' : '离线'}
        </div>
      </div>

      {/* === Center: Subtitle display (takes all available space) === */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Live ASR feed — integrated above subtitles */}
        {asrText && sessionActive && (
          <div className="mb-3 animate-fade-in" style={{ padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--accent-soft)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-ring" style={{ background: 'var(--accent)' }} />
              <span className="text-[12px] font-medium tracking-wide" style={{ color: 'var(--accent-text)' }}>聆听中</span>
            </div>
            <p className="text-[14px] leading-relaxed font-medium" style={{ color: 'var(--text)' }}>{asrText}</p>
            {partialTranslation && <p className="text-[13px] leading-relaxed mt-1" style={{ color: 'var(--accent-text)' }}>{partialTranslation}</p>}
          </div>
        )}

        {/* 全量译文切换 */}
        {sessionActive && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTranscript(!showTranscript)}
              className="text-[12px] font-medium transition-colors duration-150"
              style={{ color: showTranscript ? 'var(--accent-text)' : 'var(--text-tertiary)' }}>
              {showTranscript ? '● 全量译文' : '○ 全量译文'}
            </button>
          </div>
        )}

        {/* 全量累积译文区域 */}
        {showTranscript && fullTranscript && (
          <div className="surface p-4 max-h-[200px] overflow-y-auto animate-fade-in" style={{ fontSize: '14px' }}>
            <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{fullTranscript}</p>
          </div>
        )}

        {/* Subtitle area */}
        <div className="flex-1 min-h-0">
          <SubtitleWindow subtitles={subtitles} displayMode={displayMode} fontSize={fontSize} opacity={opacity} />
        </div>

        {/* Empty state */}
        {!sessionActive && subtitles.length === 0 && (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-center">
              <div className="text-4xl mb-4 opacity-30">🎙</div>
              <p className="text-sm font-medium mb-1">准备好开始翻译</p>
              <p className="text-xs">选择语言后点击下方开始按钮</p>
            </div>
          </div>
        )}
      </div>

      {/* === Bottom: Main control bar === */}
      <div className="pt-4 flex items-center gap-3">
        {/* Start / Pause+Resume+Stop */}
        <div className="flex-1 flex items-center gap-2.5">
          {!sessionActive ? (
            <button onClick={handleStart}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-white text-[14px] font-semibold transition-all duration-150 active:scale-[0.98]"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}>
              <svg width="10" height="13" viewBox="0 0 10 13" fill="white"><path d="M0 0v13l10-6.5z"/></svg>
              开始采集
            </button>
          ) : (
            <>
              <button onClick={() => send({ type: 'pause_session' })} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all duration-150 active:scale-[0.98] bg-yellow-500 hover:bg-yellow-600">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                暂停
              </button>
              <button onClick={() => send({ type: 'resume_session' })} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all duration-150 active:scale-[0.98]"
                style={{ background: 'var(--accent)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}>
                <svg width="10" height="13" viewBox="0 0 10 13" fill="white"><path d="M0 0v13l10-6.5z"/></svg>
                继续
              </button>
              <button onClick={handleStop} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all duration-150 active:scale-[0.98]"
                style={{ background: 'var(--danger)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--danger)')}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                停止
              </button>
            </>
          )}
        </div>

        {/* Settings + Popup */}
        <div className="flex items-center gap-2">
          <button onClick={openPopup} className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 active:scale-[0.98]"
            style={{ color: 'var(--accent-text)', background: 'var(--accent-soft)' }}>
            ▣ 悬浮窗
          </button>
          {!sessionActive && (
            <button onClick={() => setShowSettings(!showSettings)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Settings panel (collapsible) */}
      {showSettings && !sessionActive && (
        <div className="mt-3 animate-enter" style={{ padding: '12px 0', borderTop: '1px solid var(--border-light)' }}>
          <div className="flex gap-6">
            <div className="flex-1">
              <p className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>字幕字体 {fontSize}px</p>
              <input type="range" min={12} max={32} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full" style={{ accentColor: 'var(--accent)' }} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>背景不透明度 {Math.round(opacity * 100)}%</p>
              <input type="range" min={30} max={100} value={Math.round(opacity * 100)} onChange={e => setOpacity(Number(e.target.value) / 100)} className="w-full" style={{ accentColor: 'var(--accent)' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
