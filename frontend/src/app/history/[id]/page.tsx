'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TranslationEntry, SubtitleListResponse } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [subtitles, setSubtitles] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/v1/sessions/${id}/subtitles?limit=500&order=asc`)
      .then(r => r.json())
      .then((data: SubtitleListResponse) => setSubtitles(data.subtitles || []))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm mt-3">加载字幕...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 text-lg">←</button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">字幕详情</h2>
            <p className="text-xs text-gray-400">会话 {id?.slice(0, 8)} · 共 {subtitles.length} 段</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setDisplayMode('bilingual')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all duration-200 ${
              displayMode === 'bilingual' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'
            }`}>双语</button>
          <button onClick={() => setDisplayMode('chinese_only')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all duration-200 ${
              displayMode === 'chinese_only' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'
            }`}>仅中文</button>
        </div>
      </div>

      {/* 对话式时间轴 */}
      <div className="space-y-3">
        {subtitles.map((item, i) => (
          <div key={item.id || i}
            className={`flex gap-4 p-3 rounded-2xl transition-all duration-200 hover:shadow-sm ${
              item.is_revised ? 'bg-pink-50 border border-pink-100' : 'bg-white border border-gray-50'
            }`}>
            {/* 序号 */}
            <div className="shrink-0 w-8 text-center">
              <span className="text-xs text-gray-300 font-mono">{i + 1}</span>
              {item.is_revised && (
                <div className="mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                </div>
              )}
            </div>
            {/* 内容 */}
            <div className="flex-1 min-w-0 space-y-1">
              {displayMode === 'bilingual' && item.source_text && (
                <p className="text-gray-400 text-sm leading-relaxed italic">{item.source_text}</p>
              )}
              <p className="text-gray-800 text-sm leading-relaxed font-medium">{item.translated_text}</p>
            </div>
            {/* 修正历史 */}
            {item.revision_history?.length > 0 && (
              <details className="shrink-0 self-center">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-pink-500 transition-colors duration-200">
                  修正({item.revision_history.length})
                </summary>
                <div className="absolute right-4 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-64 z-10 space-y-2">
                  {item.revision_history.map((r, j) => (
                    <div key={j} className="text-xs">
                      <p className="text-gray-400 line-through">{r.old_text}</p>
                      <p className="text-gray-700 font-medium">→ {r.new_text}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
