'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CaptureSession, SessionListResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/sessions`);
      const data: SessionListResponse = await res.json();
      setSessions(data.sessions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: '进行中', color: '#7cbd5b' },
    completed: { label: '已完成', color: '#7cbd5b' },
    error: { label: '异常', color: '#f0a0b0' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">字幕记录</h2>
        <button onClick={load} disabled={loading} className="text-green-500 text-sm font-medium">{loading ? '加载中...' : '刷新'}</button>
      </div>
      <div className="space-y-3">
        {sessions.map((s) => {
          const st = statusMap[s.status] || { label: s.status, color: '#999' };
          return (
            <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">{s.title || `会话 ${s.id.slice(0, 8)}`}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.source_language} → {s.target_language} · {s.total_segments}段
                    {s.duration_seconds ? ` · ${Math.floor(s.duration_seconds / 60)}分${s.duration_seconds % 60}秒` : ''}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: st.color + '20', color: st.color }}>{st.label}</span>
              </div>
            </div>
          );
        })}
        {sessions.length === 0 && !loading && <p className="text-gray-400 text-sm text-center py-8">暂无字幕记录</p>}
      </div>
    </div>
  );
}
