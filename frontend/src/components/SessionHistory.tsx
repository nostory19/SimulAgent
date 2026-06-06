'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CaptureSession, SessionListResponse } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

interface SessionHistoryProps {
  onSelectSession?: (session: CaptureSession) => void;
  refreshTrigger?: number;
}

export function SessionHistory({ onSelectSession, refreshTrigger }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/sessions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SessionListResponse = await res.json();
      setSessions(data.sessions);
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions, refreshTrigger]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm('确认删除该会话？')) return;
    try {
      await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch { alert('删除失败'); }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: '进行中', color: '#7cbd5b' },
    paused: { label: '已暂停', color: '#f0a000' },
    completed: { label: '已完成', color: '#7cbd5b' },
    error: { label: '异常', color: '#f0a0b0' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">历史会话</h3>
        <button onClick={loadSessions} disabled={loading}
          className="text-green-500 hover:text-green-600 disabled:text-gray-300 text-xs font-medium transition-colors">
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>
      {error && <p className="text-pink-500 text-xs mb-2">{error}</p>}
      {sessions.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-4">暂无历史会话</p>
      ) : (
        <ul className="space-y-1 max-h-[300px] overflow-y-auto">
          {sessions.map((s) => {
            const st = statusMap[s.status] || { label: s.status, color: '#999' };
            return (
              <li key={s.id}
                className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-3 py-2 cursor-pointer transition-colors border border-gray-50"
                onClick={() => onSelectSession?.(s)}>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">
                    {s.title || `会话 ${s.id.slice(0, 8)}`}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {s.source_language} → {s.target_language} · {s.total_segments}段
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="text-pink-400 hover:text-pink-500 text-xs font-bold">✕</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
