'use client';

/**
 * 会话历史列表组件。
 *
 * 功能：
 * - 展示历史会话列表（标题、语言、日期、状态）
 * - 支持查看会话详情和删除操作
 * - 通过 REST API 获取和管理会话数据
 */
import { useState, useEffect, useCallback } from 'react';
import type { CaptureSession, SessionListResponse } from '../types';

interface SessionHistoryProps {
  /** 点击某个会话时回调 */
  onSelectSession?: (session: CaptureSession) => void;
  /** 外部触发刷新 */
  refreshTrigger?: number;
}

// API 基础地址，可通过 NEXT_PUBLIC_API_URL 环境变量覆盖
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

export function SessionHistory({ onSelectSession, refreshTrigger }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/sessions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SessionListResponse = await res.json();
      setSessions(data.sessions);
    } catch (e: any) {
      setError(e.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]);

  // 删除会话
  const handleDelete = async (sessionId: string) => {
    if (!confirm('确认删除该会话？此操作不可撤销。')) return;
    try {
      await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      // 从列表中移除
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert('删除失败，请重试');
    }
  };

  // 格式化状态显示
  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
      error: '异常',
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      active: 'text-green-400',
      paused: 'text-yellow-400',
      completed: 'text-blue-400',
      error: 'text-red-400',
    };
    return map[status] || 'text-gray-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 text-white text-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">历史会话</h3>
        <button
          onClick={loadSessions}
          disabled={loading}
          className="text-blue-400 hover:text-blue-300 disabled:text-gray-600 text-xs"
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-2">加载失败: {error}</p>}

      {sessions.length === 0 ? (
        <p className="text-gray-600 text-xs">暂无历史会话</p>
      ) : (
        <ul className="space-y-1 max-h-[300px] overflow-y-auto">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between bg-gray-700/50 rounded px-2 py-1 hover:bg-gray-700 cursor-pointer"
              onClick={() => onSelectSession?.(session)}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs">
                  {session.title || `会话 ${session.id.slice(0, 8)}`}
                </p>
                <p className="text-gray-500 text-xs">
                  {session.source_language} → {session.target_language}
                  {' · '}{session.total_segments}段
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className={`text-xs ${statusColor(session.status)}`}>
                  {statusLabel(session.status)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(session.id);
                  }}
                  className="text-red-500 hover:text-red-400 text-xs"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
