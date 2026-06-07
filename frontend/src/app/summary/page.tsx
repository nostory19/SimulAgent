'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CaptureSession, SessionSummary, SessionListResponse } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function SummaryPage() {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/v1/sessions?limit=50`);
      const data: SessionListResponse = await res.json();
      setSessions(data.sessions || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const loadSummary = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setActiveId(sessionId); setLoading(true); setError(''); setSummary(null);
    try {
      const res = await fetch(`${API}/api/v1/sessions/${sessionId}/summary`);
      if (res.ok) {
        setSummary(await res.json());
      } else if (res.status === 404) {
        const genRes = await fetch(`${API}/api/v1/sessions/${sessionId}/summary`, { method: 'POST' });
        if (genRes.ok) {
          setSummary(await genRes.json());
          loadSessions();
        } else {
          setError('该会话数据不足，无法生成总结');
        }
      } else {
        setError('请求失败，请重试');
      }
    } catch { setError('网络请求失败'); }
    finally { setLoading(false); }
  }, [loadSessions]);

  const completed = sessions.filter(s => s.status === 'completed');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-800">AI 智能总结</h2>
        <p className="text-xs text-gray-400 mt-0.5">基于完整转录内容生成的会议总结</p>
      </div>

      {/* Session selector */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">选择会话</p>
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {completed.map((s, idx) => (
            <div key={s.id}
              onClick={() => loadSummary(s.id)}
              className={`card-enter flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 border ${
                activeId === s.id
                  ? 'bg-white border-green-200 shadow-md'
                  : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-100 hover:shadow-sm'
              }`}>
              {/* Selection indicator */}
              <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                activeId === s.id ? 'border-green-400 bg-green-400' : 'border-gray-200'
              }`}>
                {activeId === s.id && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-700 truncate">
                  {s.title || `会话 ${s.id.slice(0, 8)}`}
                </p>
                <p className="text-[11px] text-gray-400">
                  {s.total_segments}段 · {s.duration_seconds ? `${Math.floor(s.duration_seconds / 60)}分钟` : '未知时长'}
                </p>
              </div>
              {(s as any).has_summary && (
                <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                  已有总结
                </span>
              )}
            </div>
          ))}

          {completed.length === 0 && (
            <p className="text-center py-8 text-sm text-gray-400">暂无已完成的会话</p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
          <span className="text-sm text-gray-500">AI 正在分析会话内容...</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 text-sm">
          {error}
        </div>
      )}

      {/* Summary result */}
      {summary && !loading && (
        <div className="space-y-3 card-enter">
          <button onClick={() => { setSummary(null); setActiveId(''); }}
            className="text-xs font-medium transition-colors duration-150"
            style={{ color: 'var(--text-tertiary)' }}>
            ← 返回会话列表
          </button>
          {/* Abstract */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7cbd5b, #5a9a3a)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">摘要</h3>
            </div>
            <p className="text-[14px] text-gray-600 leading-relaxed">{summary.abstract}</p>
          </div>

          {/* Key viewpoints */}
          {summary.key_viewpoints?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #7cbd5b, #5a9a3a)' }} />
                核心观点
              </h3>
              <ul className="space-y-2">
                {summary.key_viewpoints.map((v, i) => (
                  <li key={i} className="flex gap-3 text-[14px] text-gray-600 pl-4 relative">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-green-400" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Term glossary */}
          {summary.term_glossary?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #f0a0b0, #d47888)' }} />
                术语表
              </h3>
              <div className="space-y-2">
                {summary.term_glossary.map((t: any, i: number) => (
                  <div key={i} className="flex items-baseline gap-3 text-[13px]">
                    <code className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-[12px] font-medium">{t.term}</code>
                    <span className="text-gray-600">→ {t.translation}</span>
                    {t.context && <span className="text-gray-400 text-[11px] ml-auto truncate max-w-[200px]">{t.context}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action items */}
          {summary.action_items?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)' }} />
                行动项
              </h3>
              <div className="space-y-2">
                {summary.action_items.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-[13px]">
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      a.priority === 'high' ? 'bg-pink-50 text-pink-500' :
                      a.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {a.priority === 'high' ? '高优' : a.priority === 'medium' ? '中优' : '低优'}
                    </span>
                    <span className="text-gray-600">{a.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={loadSessions}
        className="w-full text-center text-gray-400 hover:text-gray-500 text-xs py-3 transition-colors duration-200">
        刷新会话列表
      </button>
    </div>
  );
}
