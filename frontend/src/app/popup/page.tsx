'use client';

/**
 * 悬浮字幕窗口——真正的同传字幕条。
 *
 * 设计：
 * - 底部半透明字幕条，不遮挡视频主体
 * - 显示最新1-2行原文+译文
 * - 修正时黄色闪烁
 * - 通过 BroadcastChannel 同步数据
 * - 配合 PowerToys Always-on-Top 或 Chrome 窗口模式使用
 */
import { useEffect, useState, useRef } from 'react';

interface SubLine {
  id: string;
  source: string;
  translation: string;
  is_revised: boolean;
}

export default function PopupPage() {
  const [lines, setLines] = useState<SubLine[]>([]);
  const [partialSource, setPartialSource] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [fontSize, setFontSize] = useState(20);
  const [opacity, setOpacity] = useState(0.7);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('simulagent_subtitles');
    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'subtitles') {
        // 取最后两条字幕展示
        const items: SubLine[] = (data.subtitles || []).slice(-2).map((s: any) => ({
          id: s.id,
          source: s.source_text || '',
          translation: s.translated_text || '',
          is_revised: s.is_revised || false,
        }));
        setLines(items);
      } else if (data.type === 'partial') {
        setPartialSource(data.source || '');
        setPartialTranslation(data.translation || '');
      } else if (data.type === 'settings') {
        if (data.displayMode) setDisplayMode(data.displayMode);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.opacity !== undefined) setOpacity(data.opacity);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, partialTranslation]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 select-none pointer-events-none"
      style={{
        background: `linear-gradient(to top, rgba(0,0,0,${opacity}) 60%, transparent)`,
        padding: '16px 24px 24px',
        minHeight: '80px',
      }}
    >
      <div ref={scrollRef} className="max-w-4xl mx-auto space-y-1" style={{ fontSize: `${fontSize}px` }}>
        {/* 最新确认的字幕行 */}
        {lines.map((line) => (
          <div
            key={line.id}
            className={`pointer-events-auto transition-all duration-500 ${
              line.is_revised ? 'text-yellow-300' : ''
            }`}
          >
            {displayMode === 'bilingual' && (
              <p className="text-gray-400 leading-snug" style={{ fontSize: '0.8em' }}>
                {line.source}
              </p>
            )}
            <p
              className="text-white leading-snug font-medium drop-shadow-lg"
              style={{
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {line.translation}
            </p>
          </div>
        ))}

        {/* 实时流式预览行 */}
        {(partialSource || partialTranslation) && (
          <div className="pointer-events-auto">
            {displayMode === 'bilingual' && partialSource && (
              <p className="text-gray-400 leading-snug animate-pulse" style={{ fontSize: '0.8em' }}>
                {partialSource.slice(-200)}
              </p>
            )}
            {partialTranslation && (
              <p className="text-green-300 leading-snug font-medium drop-shadow-lg animate-pulse"
                 style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {partialTranslation.slice(-200)}
                <span className="inline-block w-1.5 h-5 bg-green-400 ml-0.5 animate-pulse align-middle rounded-sm" />
              </p>
            )}
          </div>
        )}

        {lines.length === 0 && !partialSource && !partialTranslation && (
          <p className="text-gray-600 text-center pointer-events-auto" style={{ fontSize: '0.7em' }}>
            等待字幕...
          </p>
        )}
      </div>
    </div>
  );
}
