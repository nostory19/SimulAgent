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

  const statusMap: Record<string, { label: string; dot: string; bg: string }> = {
    active: { label: '进行中', dot: 'bg-green-400', bg: 'bg-green-50 text-green-700' },
    completed: { label: '已完成', dot: 'bg-green-400', bg: 'bg-green-50 text-green-700' },
    error: { label: '异常', dot: 'bg-pink-400', bg: 'bg-pink-50 text-pink-600' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">字幕记录</h2>
          <p className="text-xs text-gray-400 mt-0.5">点击会话查看字幕详情</p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-green-500 hover:text-green-600 text-sm font-medium transition-colors duration-200">
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {/* 时间轴列表 */}
      <div className="relative pl-6 border-l-2 border-gray-100 space-y-4">
        {sessions.map((s, idx) => {
          const st = statusMap[s.status] || { label: s.status, dot: 'bg-gray-400', bg: 'bg-gray-50 text-gray-500' };
          return (
            <div key={s.id} className="relative"
              onClick={() => router.push(`/history/${s.id}`)}>
              {/* 时间轴圆点 */}
              <div className={`absolute -left-[25px] top-4 w-3 h-3 rounded-full border-2 border-white ${st.dot} shadow-sm`} />
              {/* 卡片 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {s.title || `会话 ${s.id.slice(0, 8)}`}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {s.source_language} → {s.target_language}
                  {s.total_segments > 0 && ` · ${s.total_segments}段`}
                  {s.duration_seconds ? ` · ${Math.floor(s.duration_seconds / 60)}分${s.duration_seconds % 60}秒` : ''}
                </p>
                {s.started_at && (
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(s.started_at).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {sessions.length === 0 && !loading && (
          <p className="text-gray-400 text-sm text-center py-8">暂无字幕记录</p>
        )}
      </div>
    </div>
  );
}
