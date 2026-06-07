'use client';

import { useState, useRef, useEffect } from 'react';

/** 国旗 SVG path 数据 (64x48 viewBox) */
const FLAGS: Record<string, string> = {
  en: 'M0 0h64v48H0z', // dummy - replaced by inline SVG
  zh: 'M0 0h64v48H0V0z',
  ja: 'M0 0h64v48H0V0z',
  ko: 'M0 0h64v48H0V0z',
  fr: 'M0 0h21v48H0zM21 0h22v48H21zM43 0h21v48H43z',
  de: 'M0 0h64v16H0zM0 16h64v16H0zM0 32h64v16H0z',
  es: 'M0 0h64v12H0zM0 12h64v12H0zM0 24h64v12H0zM0 36h64v12H0z',
};

/** 国旗 SVG 组件 — 各国家/地区简化版旗帜 */
function FlagIcon({ code }: { code: string }) {
  switch (code) {
    case 'en': // 美国 — 星条旗简化
      return (
        <svg width="22" height="14" viewBox="0 0 64 48" className="rounded-sm shadow-sm shrink-0">
          <rect width="64" height="3.7" fill="#B22234" /><rect y="3.7" width="64" height="3.7" fill="#fff" />
          <rect y="7.4" width="64" height="3.7" fill="#B22234" /><rect y="11.1" width="64" height="3.7" fill="#fff" />
          <rect y="14.8" width="64" height="3.7" fill="#B22234" /><rect y="18.5" width="64" height="3.7" fill="#fff" />
          <rect y="22.2" width="64" height="3.7" fill="#B22234" /><rect y="25.9" width="64" height="3.7" fill="#fff" />
          <rect y="29.6" width="64" height="3.7" fill="#B22234" /><rect y="33.3" width="64" height="3.7" fill="#fff" />
          <rect y="37.0" width="64" height="3.7" fill="#B22234" /><rect y="40.7" width="64" height="3.7" fill="#fff" />
          <rect y="44.4" width="64" height="3.7" fill="#B22234" />
          <rect width="26" height="25.9" fill="#3C3B6E" />
          {[[2,3],[6,3],[10,3],[2,8],[6,8],[10,8],[4,5],[8,5],[4,10],[8,10]].map(([x,y], i) =>
            <polygon key={i} points={`${x+1},${y} ${x+2.5},${y+1.5} ${x+2.3},${y+3.5} ${x+1},${y+2.5} ${x-0.3},${y+3.5} ${x-0.5},${y+1.5}`} fill="#fff" />
          )}
        </svg>
      );
    case 'zh': // 中国 — 五星红旗
      return (
        <svg width="22" height="14" viewBox="0 0 64 48" className="rounded-sm shadow-sm shrink-0">
          <rect width="64" height="48" fill="#DE2910" />
          {[[16,10,5],[28,6,2,15],[30,12,2,28],[28,18,2,35],[24,22,2,40]].map(([cx,cy,r,rot], i) => (
            <polygon key={i} points="0,-1 0.22,-0.3 0.95,-0.3 0.35,0.13 0.58,0.8 0,0.4 -0.58,0.8 -0.35,0.13 -0.95,-0.3 -0.22,-0.3"
              fill="#FFDE00" transform={`translate(${cx*2},${cy*2}) scale(${(r||5)*2}) rotate(${rot||0})`} />
          ))}
        </svg>
      );
    case 'ja': // 日本
      return (
        <svg width="22" height="14" viewBox="0 0 64 48" className="rounded-sm shadow-sm shrink-0">
          <rect width="64" height="48" fill="#fff" />
          <circle cx="32" cy="24" r="10" fill="#BC002D" />
        </svg>
      );
    case 'ko': // 韩国
      return (
        <svg width="22" height="14" viewBox="0 0 64 48" className="rounded-sm shadow-sm shrink-0">
          <rect width="64" height="48" fill="#fff" />
          <circle cx="32" cy="24" r="12" fill="#C60C30" />
          <rect x="26" y="4" width="12" height="20" fill="#003478" />
          <rect x="26" y="24" width="12" height="20" fill="#C60C30" />
          <circle cx="32" cy="24" r="6" fill="#C60C30" clipPath="url(#kh)" />
          <defs><clipPath id="kh"><rect x="26" y="4" width="12" height="20" /></clipPath></defs>
        </svg>
      );
    case 'fr': // 法国
    case 'de': // 德国
    case 'es': // 西班牙
    default:
      return (
        <svg width="22" height="14" viewBox="0 0 64 48" className="rounded-sm shadow-sm shrink-0">
          {code === 'fr' && <><rect width="21" height="48" fill="#002395" /><rect x="21" width="22" height="48" fill="#fff" /><rect x="43" width="21" height="48" fill="#ED2939" /></>}
          {code === 'de' && <><rect y="0" width="64" height="16" fill="#000" /><rect y="16" width="64" height="16" fill="#DD0000" /><rect y="32" width="64" height="16" fill="#FFCE00" /></>}
          {code === 'es' && <><rect y="0" width="64" height="12" fill="#AA151B" /><rect y="12" width="64" height="12" fill="#F1BF00" /><rect y="24" width="64" height="12" fill="#AA151B" /><rect y="36" width="64" height="12" fill="#F1BF00" /></>}
        </svg>
      );
  }
}

const LANG: Record<string, { label: string; native: string }> = {
  en: { label: 'English', native: 'English' },
  zh: { label: '简体中文', native: '中文（简体）' },
  ja: { label: '日本語', native: '日本語' },
  ko: { label: '한국어', native: '한국어' },
  fr: { label: 'Français', native: 'Français' },
  de: { label: 'Deutsch', native: 'Deutsch' },
  es: { label: 'Español', native: 'Español' },
};

interface LangSelectProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

export function LangSelect({ value, onChange, label }: LangSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANG[value] || LANG.en;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {label && (
        <p className="text-[10px] text-gray-400 font-medium mb-1 ml-1 uppercase tracking-wider">{label}</p>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:border-green-300 transition-colors duration-200 focus:outline-none">
        <FlagIcon code={value} />
        <span className="flex-1 text-left">{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
          style={{ animation: 'cardIn 0.12s ease-out' }}>
          {Object.entries(LANG).map(([code, item]) => (
            <button
              key={code}
              onClick={() => { onChange(code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 hover:bg-green-50 ${
                value === code ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-600'
              }`}>
              <FlagIcon code={code} />
              <span>{item.label} ({item.native})</span>
              {value === code && (
                <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="#7cbd5b"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
