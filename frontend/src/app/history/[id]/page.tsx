'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TranslationEntry, SubtitleListResponse } from '@/types';
import Pagination from '@/components/Pagination';
import { speak, stopPlayback, prefetchTts } from '@/lib/tts';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [subtitles, setSubtitles] = useState<TranslationEntry[]>([]);
  const [fullSubtitles, setFullSubtitles] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'bilingual' | 'chinese_only' | 'full_transcript'>('bilingual');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // TTS 播放状态
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('茉莉');

  // 从 localStorage 恢复音色选择
  useEffect(() => {
    const saved = localStorage.getItem('tts_voice');
    if (saved) setSelectedVoice(saved);
  }, []);

  const handleVoiceChange = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('tts_voice', voice);
  }, []);

  const handlePlay = useCallback(async (text: string, id: string) => {
    if (playingId === id) {
      stopPlayback();
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    try {
      await speak(text, selectedVoice);
    } catch (e) { console.error('TTS error:', e); }
    finally { setPlayingId(null); }
  }, [playingId, selectedVoice]);

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

  // 加载全量字幕（用于全量译文视图）
  const loadAllSubtitles = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/sessions/${id}/subtitles?limit=9999&offset=0&order=asc`);
      const data: SubtitleListResponse = await res.json();
      setFullSubtitles(data.subtitles || []);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (viewMode === 'full_transcript') {
      loadAllSubtitles();
    } else {
      loadSubtitles(page);
    }
  }, [viewMode, loadSubtitles, loadAllSubtitles, page]);

  // 预取当前可见字幕的 TTS 音频
  useEffect(() => {
    const items = viewMode === 'full_transcript' ? fullSubtitles : subtitles;
    if (items.length === 0) return;
    // 延迟预取，避免阻塞渲染
    const timer = setTimeout(() => {
      for (const item of items) {
        if (item.source_text) prefetchTts(item.source_text, selectedVoice);
        if (item.translated_text) prefetchTts(item.translated_text, selectedVoice);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subtitles, fullSubtitles, selectedVoice, viewMode]);

  const handleViewModeChange = useCallback((mode: typeof viewMode) => {
    setViewMode(mode);
  }, []);

  // 拼接全量译文/原文
  const fullSourceText = fullSubtitles.map(s => s.source_text).filter(Boolean).join(' ');
  const fullTranslatedText = fullSubtitles.map(s => s.translated_text).filter(Boolean).join(' ');

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between sticky top-0 z-10 py-4 gap-3" style={{ background: 'rgba(247, 248, 250, 0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-200 transition-all duration-200 shadow-sm shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h2 className="text-base md:text-lg font-bold text-gray-800">字幕详情</h2>
            <p className="text-[11px] md:text-xs text-gray-400">{id?.slice(0, 12)} · 共 {total} 段对话</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 音色选择 */}
          <select
            value={selectedVoice}
            onChange={e => handleVoiceChange(e.target.value)}
            className="text-[11px] text-gray-500 bg-gray-100 border-0 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <optgroup label="中文">
              <option value="冰糖">冰糖 (女)</option>
              <option value="茉莉">茉莉 (女)</option>
              <option value="苏打">苏打 (男)</option>
              <option value="白桦">白桦 (男)</option>
            </optgroup>
            <optgroup label="English">
              <option value="Mia">Mia (F)</option>
              <option value="Chloe">Chloe (F)</option>
              <option value="Milo">Milo (M)</option>
              <option value="Dean">Dean (M)</option>
            </optgroup>
          </select>
          {/* View mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            {([['bilingual', '中英双语'], ['chinese_only', '仅中文'], ['full_transcript', '全量译文']] as const).map(([mode, label]) => (
              <button key={mode} onClick={() => handleViewModeChange(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition-all duration-200 ${
                  viewMode === mode ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-500'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtitle content */}
      <div className="space-y-3 pb-12">
        {viewMode === 'full_transcript' ? (
          /* ===== 全量译文视图 ===== */
          loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
            </div>
          ) : fullTranslatedText ? (
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              {/* 英文原文 */}
              {fullSourceText && (
                <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">原文</span>
                    <span className="text-[11px] text-gray-300">{total} 段</span>
                    <button
                      onClick={() => handlePlay(fullSourceText, 'full-src')}
                      onMouseEnter={() => prefetchTts(fullSourceText, selectedVoice)}
                      className={`ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        playingId === 'full-src'
                          ? 'text-purple-600 bg-purple-50 animate-pulse'
                          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                      }`}
                      title="播放全量原文"
                    >
                      {playingId === 'full-src' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[14px] text-gray-500 leading-[1.85] italic">{fullSourceText}</p>
                </div>
              )}
              {/* 中文译文 */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">译文</span>
                  <span className="text-[11px] text-gray-300">{total} 段</span>
                  <button
                    onClick={() => handlePlay(fullTranslatedText, 'full-tgt')}
                    onMouseEnter={() => prefetchTts(fullTranslatedText, selectedVoice)}
                    className={`ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      playingId === 'full-tgt'
                        ? 'text-purple-600 bg-purple-50 animate-pulse'
                        : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                    }`}
                    title="播放全量译文"
                  >
                    {playingId === 'full-tgt' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    )}
                  </button>
                </div>
                <p className="text-[15px] text-gray-800 leading-[1.85] font-medium">{fullTranslatedText}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400">暂无字幕数据</p>
            </div>
          )
        ) : (
          /* ===== 分段字幕视图 ===== */
          <>
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
                    <div className={`relative px-4 py-2.5 rounded-2xl rounded-tl-md transition-all duration-300 group/bubble ${
                      item.is_revised
                        ? 'bg-pink-50 border border-pink-100'
                        : 'bg-gray-50'
                    }`}>
                      <p className="text-[13px] text-gray-500 leading-relaxed italic pr-8">{item.source_text}</p>
                      <button
                        onClick={() => handlePlay(item.source_text, `src-${item.id}`)}
                        onMouseEnter={() => prefetchTts(item.source_text, selectedVoice)}
                        className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                          playingId === `src-${item.id}`
                            ? 'text-purple-600 bg-purple-50'
                            : 'text-gray-300 opacity-0 group-hover/bubble:opacity-100 hover:text-gray-500 hover:bg-gray-100'
                        }`}
                        title="播放原文"
                      >
                        {playingId === `src-${item.id}` ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                      </button>
                    </div>
                  )}
                  {/* Translation bubble (Chinese) */}
                  <div className={`relative px-4 py-2.5 rounded-2xl rounded-tl-md transition-all duration-300 group/bubble ${
                    item.is_revised
                      ? 'bg-gradient-to-r from-pink-50 to-white border border-pink-100'
                      : 'bg-white border border-gray-50 shadow-sm'
                  }`}>
                    <p className={`text-[14px] leading-relaxed pr-8 ${item.is_revised ? 'text-pink-700 font-medium' : 'text-gray-800 font-medium'}`}>
                      {item.translated_text}
                    </p>
                    <button
                      onClick={() => handlePlay(item.translated_text, `tgt-${item.id}`)}
                      onMouseEnter={() => prefetchTts(item.translated_text, selectedVoice)}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                        playingId === `tgt-${item.id}`
                          ? 'text-purple-600 bg-purple-50'
                          : 'text-gray-300 opacity-0 group-hover/bubble:opacity-100 hover:text-gray-500 hover:bg-gray-100'
                      }`}
                      title="播放译文"
                    >
                      {playingId === `tgt-${item.id}` ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      )}
                    </button>
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
          </>
        )}
      </div>
    </div>
  );
}
