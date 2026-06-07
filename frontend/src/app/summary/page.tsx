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
    setActiveId(sessionId);
    setLoading(true); setError(''); setSummary(null);
    try {
      const res = await fetch(`${API}/api/v1/sessions/${sessionId}/summary`);
      if (res.ok) {
        setSummary(await res.json());
      } else if (res.status === 404) {
        // 没有总结，尝试生成
        const genRes = await fetch(`${API}/api/v1/sessions/${sessionId}/summary`, { method: 'POST' });
        if (genRes.ok) setSummary(await genRes.json());
        else setError('该会话暂无足够数据生成总结');
      } else {
        setError('查询失败');
      }
    } catch { setError('网络请求失败'); }
    finally { setLoading(false); }
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">AI总结</h2>
      <p className="text-xs text-gray-400">选择已完成的会话查看或生成AI总结</p>

      {/* 会话列表 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sessions.filter(s => s.status === 'completed').map((s) => (
          <div key={s.id}
            onClick={() => loadSummary(s.id)}
            className={`bg-white rounded-2xl p-3 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
              activeId === s.id ? 'border-green-300 bg-green-50' : 'border-gray-100'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {s.title || `会话 ${s.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-gray-400">
                  {s.source_language}→{s.target_language} · {s.total_segments}段
                  {s.duration_seconds ? ` · ${Math.floor(s.duration_seconds / 60)}分钟` : ''}
                </p>
              </div>
              <span className="text-xs text-green-600">{s.has_summary ? '已有总结' : '可生成'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 加载 */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin inline-block w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full mr-2" />
          <span className="text-sm text-gray-500">AI分析中...</span>
        </div>
      )}

      {error && <p className="text-pink-500 text-sm">{error}</p>}

      {/* 总结内容 */}
      {summary && !loading && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-green-600 mb-2">摘要</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{summary.abstract}</p>
          </div>

          {summary.key_viewpoints?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-green-600 mb-2">核心观点</h3>
              <ul className="space-y-1">
                {summary.key_viewpoints.map((v, i) => (
                  <li key={i} className="text-gray-700 text-sm flex gap-2"><span className="text-green-500">•</span>{v}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.term_glossary?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-green-600 mb-2">术语表</h3>
              <div className="space-y-1">
                {summary.term_glossary.map((t: any, i: number) => (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <code className="text-green-600 text-xs bg-green-50 px-1.5 py-0.5 rounded">{t.term}</code>
                    <span className="text-gray-600">→ {t.translation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.action_items?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-green-600 mb-2">行动项</h3>
              <div className="space-y-1">
                {summary.action_items.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      a.priority === 'high' ? 'bg-pink-100 text-pink-500' : a.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                    }`}>{a.priority}</span>
                    <span className="text-gray-600">{a.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={loadSessions} className="w-full text-center text-gray-400 hover:text-gray-600 text-xs py-2 transition-colors">刷新会话列表</button>
    </div>
  );
}
