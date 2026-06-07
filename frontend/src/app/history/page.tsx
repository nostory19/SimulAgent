'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CaptureSession, SessionListResponse } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/sessions`);
      const data: SessionListResponse = await res.json();
      setSessions(data.sessions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    active: { label: '进行中', dot: 'bg-green-400', bg: 'bg-green-50', text: 'text-green-600' },
    completed: { label: '已完成', dot: 'bg-green-400', bg: 'bg-green-50', text: 'text-green-600' },
    paused: { label: '已暂停', dot: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-600' },
    error: { label: '异常', dot: 'bg-pink-400', bg: 'bg-pink-50', text: 'text-pink-500' },
  };

  const formatDuration = (s: number) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">字幕记录</h2>
          <p className="text-xs text-gray-400 mt-0.5">所有会话的完整转录和翻译记录</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors duration-200 px-3 py-1.5 rounded-xl hover:bg-gray-50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          {loading ? '刷新中' : '刷新'}
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: 'linear-gradient(to bottom, var(--green-soft), #f0f0f0)' }} />

        <div className="space-y-2">
          {sessions.map((s, idx) => {
            const st = statusConfig[s.status] || statusConfig.completed;
            const date = s.started_at ? new Date(s.started_at) : null;
            return (
              <div key={s.id} onClick={() => router.push(`/history/${s.id}`)}
                className="card-enter relative pl-10 cursor-pointer group">
                {/* Timeline dot */}
                <div className={`absolute left-[15px] top-4 w-[9px] h-[9px] rounded-full border-2 border-white ${st.dot} shadow-sm transition-transform duration-200 group-hover:scale-125`} />

                {/* Card */}
                <div className="bg-white rounded-2xl p-4 border transition-all duration-200 group-hover:-translate-y-0.5"
                  style={{
                    borderColor: 'var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-semibold text-gray-800 mb-0.5 truncate">
                        {s.title || `会话 ${s.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-[12px] text-gray-400">
                        {s.source_language} → {s.target_language}
                        {s.total_segments > 0 && ` · ${s.total_segments}段`}
                        {s.duration_seconds ? ` · ${formatDuration(s.duration_seconds)}` : ''}
                      </p>
                      {date && (
                        <p className="text-[11px] text-gray-300 mt-1">
                          {date.toLocaleDateString('zh-CN')} {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                      <span className="text-[11px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        查看详情 →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sessions.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/>
            </svg>
          </div>
          <p className="text-sm text-gray-400">暂无字幕记录</p>
          <p className="text-xs text-gray-300 mt-1">开始实时翻译后，会话将自动保存到这里</p>
        </div>
      )}
    </div>
  );
}
