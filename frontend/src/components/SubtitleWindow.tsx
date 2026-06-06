'use client';

import { useRef, useEffect } from 'react';

export interface SubtitleItem {
  id: string;
  sequence_number: number;
  source_text: string;
  translated_text: string;
  is_revised: boolean;
  timestamp_ms: number;
}

interface SubtitleWindowProps {
  subtitles: SubtitleItem[];
  displayMode: 'bilingual' | 'chinese_only';
  fontSize: number;
  opacity: number;
}

export function SubtitleWindow({ subtitles, displayMode, fontSize, opacity }: SubtitleWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [subtitles]);

  const bg = `rgba(20, 20, 22, ${opacity})`;
  const recent = subtitles.slice(-10);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: bg, fontSize }}>
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto p-4 space-y-2" style={{ scrollBehavior: 'smooth' }}>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-center text-sm">等待字幕...</p>
        ) : (
          recent.map((item) => (
            <div key={item.id} className={`transition-all duration-500 rounded-lg px-3 py-1.5 ${item.is_revised ? 'bg-pink-900/20 border-l-2 border-pink-400' : ''}`}>
              {displayMode === 'bilingual' && (
                <p className="text-gray-400 leading-snug" style={{ fontSize: '0.82em' }}>{item.source_text}</p>
              )}
              <p className={`leading-snug font-medium ${item.is_revised ? 'text-pink-300' : 'text-white'}`}
                 style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {item.translated_text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
