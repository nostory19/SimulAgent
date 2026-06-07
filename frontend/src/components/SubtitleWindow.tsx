'use client';

import { useRef, useEffect } from 'react';

export interface SubtitleItem {
  id: string; sequence_number: number;
  source_text: string; translated_text: string;
  is_revised: boolean; timestamp_ms: number;
}

interface SubtitleWindowProps {
  subtitles: SubtitleItem[];
  displayMode: 'bilingual' | 'chinese_only';
  fontSize: number;
  opacity: number;
}

export function SubtitleWindow({ subtitles, displayMode, fontSize, opacity }: SubtitleWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [subtitles]);
  const recent = subtitles.slice(-12);

  return (
    <div className="h-full overflow-hidden rounded-lg"
      style={{ background: `rgba(18,18,20,${opacity})`, fontSize }}>
      <div ref={scrollRef} className="h-full overflow-y-auto p-5 space-y-3"
        style={{ scrollBehavior: 'smooth' }}>
        {recent.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs tracking-widest opacity-20 font-medium" style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>STANDBY</p>
          </div>
        ) : (
          recent.map(item => (
            <div key={item.id} className="transition-all duration-300"
              style={{ opacity: 1 }}>
              {/* English source */}
              {displayMode === 'bilingual' && (
                <p className="leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8em' }}>
                  {item.source_text}
                </p>
              )}
              {/* Chinese translation */}
              <p className={`leading-relaxed font-medium ${item.is_revised ? 'animate-fade-in' : ''}`}
                style={{
                  color: item.is_revised ? 'rgba(193,125,139,0.9)' : 'rgba(240,215,140,0.95)',
                  textShadow: '0 0.5px 2px rgba(0,0,0,0.5)',
                  textDecoration: item.is_revised ? undefined : undefined,
                }}>
                {item.translated_text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
