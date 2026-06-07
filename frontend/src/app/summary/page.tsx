'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SessionSummary } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function SummaryPage() {
  const [sessionId, setSessionId] = useState('');
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!sessionId.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId.trim()}/summary`);
      if (res.ok) setSummary(await res.json());
      else setError('该会话暂无总结或ID不正确');
    } catch (e) {
      setError('请求失败');
    } finally { setLoading(false); }
  }, [sessionId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">AI总结</h2>

      {/* 输入会话ID */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-500 mb-2">输入已有会话ID查看总结</p>
        <div className="flex gap-2">
          <input value={sessionId} onChange={(e) => setSessionId(e.target.value)}
            placeholder="请输入会话ID" onKeyDown={(e) => e.key === 'Enter' && loadSummary()}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 focus:outline-none" />
          <button onClick={loadSummary} disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
            {loading ? '查询中...' : '查询'}
          </button>
        </div>
        {error && <p className="text-pink-500 text-xs mt-2">{error}</p>}
      </div>

      {/* 总结内容 */}
      {summary && (
        <div className="space-y-3">
          {/* 摘要 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-green-600 mb-2">摘要</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{summary.abstract}</p>
          </div>
          {/* 核心观点 */}
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
          {/* 术语表 */}
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
          {/* 行动项 */}
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
    </div>
  );
}
