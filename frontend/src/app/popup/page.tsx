'use client';

/**
 * 无边框悬浮字幕窗口 — 类似 Bilibili 小窗模式。
 *
 * 窗口内全部是字幕内容，无标题栏、无留白、无 chrome。
 * 暗色半透明背景铺满，字幕靠底部自然排列。
 */
import { useEffect, useState, useRef } from 'react';

export default function PopupPage() {
  const [lines, setLines] = useState<{ id: string; source: string; translation: string; is_revised: boolean }[]>([]);
  const [partialSource, setPartialSource] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [fontSize, setFontSize] = useState(16);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('simulagent_subtitles');
    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'subtitles') {
        setLines((data.subtitles || []).slice(-20).map((s: any) => ({
          id: s.id, source: s.source_text || '', translation: s.translated_text || '',
          is_revised: s.is_revised || false,
        })));
      } else if (data.type === 'partial') {
        setPartialSource(data.source || '');
        setPartialTranslation(data.translation || '');
      } else if (data.type === 'settings') {
        if (data.displayMode) setDisplayMode(data.displayMode);
        if (data.fontSize) setFontSize(data.fontSize);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, partialTranslation]);

  return (
    <div className="h-screen w-screen overflow-hidden select-none"
      style={{ background: 'rgba(18,18,20,0.88)' }}>
      <div ref={scrollRef} className="h-full w-full overflow-y-auto px-4 py-3 space-y-2"
        style={{ fontSize: `${fontSize}px`, scrollBehavior: 'smooth' }}>
        {/* 已确认的多行字幕——可滚动回看 */}
        {lines.map((line, i) => {
          const isLatest = i === lines.length - 1;
          const stale = isLatest && partialSource && line.source && !partialSource.includes(line.source);
          return (
            <div key={line.id} className="transition-all duration-500"
              style={{ opacity: stale ? 0.35 : 1 }}>
              {displayMode === 'bilingual' && line.source && (
                <p className="leading-snug" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8em' }}>
                  {line.source}
                </p>
              )}
              <p className={`leading-snug font-medium ${line.is_revised ? 'animate-fade-in' : ''}`}
                style={{ color: line.is_revised ? '#e8bcc4' : '#f0d78c' }}>
                {line.translation}
              </p>
            </div>
          );
        })}

        {/* 流式实时预览 */}
        {(partialSource || partialTranslation) && (
          <div>
            {displayMode === 'bilingual' && partialSource && (
              <p className="leading-snug" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8em' }}>
                {partialSource}
              </p>
            )}
            <p className="leading-snug font-medium" style={{ color: partialTranslation ? '#f0d78c' : 'rgba(255,255,255,0.08)' }}>
              {partialTranslation || '...'}
              {!partialTranslation && (
                <span className="inline-block w-1 h-[1em] align-middle ml-0.5 rounded-sm animate-pulse"
                  style={{ background: 'rgba(240,215,140,0.3)' }} />
              )}
            </p>
          </div>
        )}

        {lines.length === 0 && !partialSource && !partialTranslation && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs tracking-widest opacity-20 font-medium"
              style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>STANDBY</p>
          </div>
        )}
      </div>
    </div>
  );
}
