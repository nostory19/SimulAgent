'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TranslationEntry, SubtitleListResponse } from '@/types';
import Pagination from '@/components/Pagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [subtitles, setSubtitles] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadSubtitles = useCallback(async (p: number) => {
    if (!id) return;
    setLoading(true);
    try {
      const offset = (p - 1) * pageSize;
      const res = await fetch(`${API}/api/v1/sessions/${id}/subtitles?limit=${pageSize}&offset=${offset}&order=asc`);
      const data: SubtitleListResponse = await res.json();
      setSubtitles(data.subtitles || []);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadSubtitles(page); }, [loadSubtitles, page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">加载字幕中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 py-4" style={{ background: 'rgba(247, 248, 250, 0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-200 transition-all duration-200 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">字幕详情</h2>
            <p className="text-xs text-gray-400">{id?.slice(0, 12)} · 共 {total} 段对话</p>
          </div>
        </div>
        {/* View mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          {(['bilingual', 'chinese_only'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition-all duration-200 ${
                viewMode === mode ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-500'
              }`}>
              {mode === 'bilingual' ? '中英双语' : '仅中文'}
            </button>
          ))}
        </div>
      </div>

      {/* Subtitle timeline — chat bubble style */}
      <div className="space-y-3 pb-12">
        {subtitles.map((item, i) => (
          <div key={item.id || i}
            className="card-enter flex gap-4 group">
            {/* Sequence badge */}
            <div className="shrink-0 pt-0.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-medium transition-all duration-300 ${
                item.is_revised
                  ? 'bg-pink-50 text-pink-500 ring-1 ring-pink-200'
                  : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'
              }`}>
                {(page - 1) * pageSize + i + 1}
              </div>
            </div>

            {/* Content bubbles */}
            <div className="flex-1 space-y-1.5">
              {/* Source text bubble (English) */}
              {viewMode === 'bilingual' && item.source_text && (
                <div className={`relative px-4 py-2.5 rounded-2xl rounded-tl-md transition-all duration-300 ${
                  item.is_revised
                    ? 'bg-pink-50 border border-pink-100'
                    : 'bg-gray-50'
                }`}>
                  <p className="text-[13px] text-gray-500 leading-relaxed italic">{item.source_text}</p>
                </div>
              )}
              {/* Translation bubble (Chinese) */}
              <div className={`relative px-4 py-2.5 rounded-2xl rounded-tl-md transition-all duration-300 ${
                item.is_revised
                  ? 'bg-gradient-to-r from-pink-50 to-white border border-pink-100'
                  : 'bg-white border border-gray-50 shadow-sm'
              }`}>
                <p className={`text-[14px] leading-relaxed ${item.is_revised ? 'text-pink-700 font-medium' : 'text-gray-800 font-medium'}`}>
                  {item.translated_text}
                </p>
              </div>

              {/* Revision indicator */}
              {item.is_revised && (
                <div className="flex items-center gap-1.5 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  <span className="text-[11px] text-pink-500">已自动修正</span>
                  {item.revision_history?.length > 0 && (
                    <details className="ml-2">
                      <summary className="text-[11px] text-pink-400 cursor-pointer hover:text-pink-600 transition-colors">
                        查看历史 ({item.revision_history.length})
                      </summary>
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-pink-100">
                        {item.revision_history.map((r, j) => (
                          <div key={j} className="text-[11px] pl-2">
                            <p className="text-gray-400 line-through">{r.old_text}</p>
                            <p className="text-gray-700 font-medium">→ {r.new_text}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 分页 */}
        {subtitles.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} />
        )}

        {subtitles.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <p className="text-sm text-gray-400">暂无字幕数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
