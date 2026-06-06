'use client';

/**
 * 浮动字幕窗口组件。
 *
 * 功能：
 * - 实时渲染双行字幕（原文 + 译文）或单行（仅中文）
 * - 新增字幕自动滚动到底部
 * - 修正后的字幕高亮闪烁
 * - 可调节字体大小、透明度、位置
 */
import { useEffect, useRef, useState } from 'react';

export interface SubtitleItem {
  id: string;
  sequence_number: number;
  source_text: string;
  translated_text: string;
  is_revised: boolean;
  timestamp_ms: number;
}

interface SubtitleWindowProps {
  /** 字幕列表 */
  subtitles: SubtitleItem[];
  /** 显示模式：bilingual 双语 / chinese_only 仅中文 */
  displayMode: 'bilingual' | 'chinese_only';
  /** 字体大小（px） */
  fontSize?: number;
  /** 背景透明度 (0-1) */
  opacity?: number;
}

export function SubtitleWindow({
  subtitles,
  displayMode = 'bilingual',
  fontSize = 18,
  opacity = 0.85,
}: SubtitleWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // 新字幕或修正字幕时自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [subtitles]);

  // 修正字幕高亮：闪烁 2 秒后消失
  useEffect(() => {
    const revised = subtitles.find((s) => s.is_revised);
    if (revised) {
      setHighlightedId(revised.id);
      const timer = setTimeout(() => setHighlightedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [subtitles]);

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto rounded-lg p-3 space-y-2"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        fontSize: `${fontSize}px`,
        maxHeight: '400px',
      }}
    >
      {subtitles.length === 0 ? (
        <p className="text-gray-500 text-center text-sm">等待字幕...</p>
      ) : (
        subtitles.map((item) => (
          <div
            key={item.id}
            className={`transition-all duration-300 rounded px-2 py-1 ${
              item.is_revised && item.id === highlightedId
                ? 'bg-yellow-900/50 ring-1 ring-yellow-500 animate-pulse'
                : ''
            }`}
          >
            {/* 原文行（双语模式下显示） */}
            {displayMode === 'bilingual' && (
              <p className="text-gray-400 text-sm leading-snug">{item.source_text}</p>
            )}
            {/* 译文行 */}
            <p
              className={`leading-snug ${
                item.is_revised ? 'text-yellow-300' : 'text-white'
              }`}
            >
              {item.translated_text}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
