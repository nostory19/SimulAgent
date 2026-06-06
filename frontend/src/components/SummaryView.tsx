'use client';

/**
 * AI 会议总结展示组件。
 *
 * 展示结构化总结：摘要、核心观点、术语表、行动项。
 * 支持折叠展开、复制和导出。
 */
import { useState } from 'react';
import type { SessionSummary } from '../types';

interface SummaryViewProps {
  summary: SessionSummary | null;
  loading: boolean;
  onGenerate?: () => void;
  sessionEnded?: boolean;
  sessionId?: string;
}

export function SummaryView({ summary, loading, onGenerate, sessionEnded, sessionId }: SummaryViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    abstract: true,
    viewpoints: true,
    glossary: false,
    actions: true,
  });

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCopy = () => {
    const text = summary
      ? [
          `# 会话总结 (${sessionId?.slice(0, 8) || 'N/A'})`,
          '',
          '## 摘要',
          summary.abstract,
          '',
          '## 核心观点',
          ...(summary.key_viewpoints || []).map((v: string) => `- ${v}`),
          '',
          '## 术语表',
          ...(summary.term_glossary || []).map(
            (t: any) => `- ${t.term} → ${t.translation} (${t.context || ''})`
          ),
          '',
          '## 行动项',
          ...(summary.action_items || []).map((a: any) => `- [${a.priority}] ${a.item}`),
        ].join('\n')
      : '';
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-2">
      {/* 触发按钮 */}
      {sessionEnded && !summary && (
        <button
          onClick={onGenerate}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? '正在生成总结...' : '生成AI总结'}
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="animate-spin inline-block w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full mr-2" />
          <span className="text-gray-400 text-sm">AI 正在分析会话内容...</span>
        </div>
      )}

      {/* Summary Content */}
      {summary && (
        <div className="space-y-2">
          {/* 摘要 */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle('abstract')}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-emerald-400 text-sm font-medium">摘要</span>
              <span className="text-gray-500 text-xs">{expanded.abstract ? '收起' : '展开'}</span>
            </button>
            {expanded.abstract && (
              <p className="px-3 pb-3 text-gray-300 text-sm leading-relaxed">{summary.abstract}</p>
            )}
          </div>

          {/* 核心观点 */}
          {summary.key_viewpoints?.length > 0 && (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle('viewpoints')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-emerald-400 text-sm font-medium">
                  核心观点 ({summary.key_viewpoints.length})
                </span>
                <span className="text-gray-500 text-xs">{expanded.viewpoints ? '收起' : '展开'}</span>
              </button>
              {expanded.viewpoints && (
                <ul className="px-3 pb-3 space-y-1">
                  {summary.key_viewpoints.map((v: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm flex gap-2">
                      <span className="text-emerald-500 shrink-0">•</span>
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 术语表 */}
          {summary.term_glossary?.length > 0 && (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle('glossary')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-emerald-400 text-sm font-medium">
                  术语表 ({summary.term_glossary.length})
                </span>
                <span className="text-gray-500 text-xs">{expanded.glossary ? '收起' : '展开'}</span>
              </button>
              {expanded.glossary && (
                <div className="px-3 pb-3 space-y-1">
                  {summary.term_glossary.map((t: any, i: number) => (
                    <div key={i} className="flex items-baseline gap-2 text-sm">
                      <code className="text-emerald-300 text-xs bg-gray-900 px-1 rounded">{t.term}</code>
                      <span className="text-gray-300">→ {t.translation}</span>
                      {t.context && <span className="text-gray-600 text-xs truncate">({t.context})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 行动项 */}
          {summary.action_items?.length > 0 && (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle('actions')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-emerald-400 text-sm font-medium">
                  行动项 ({summary.action_items.length})
                </span>
                <span className="text-gray-500 text-xs">{expanded.actions ? '收起' : '展开'}</span>
              </button>
              {expanded.actions && (
                <div className="px-3 pb-3 space-y-1">
                  {summary.action_items.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span
                        className={`text-xs px-1 rounded ${
                          a.priority === 'high'
                            ? 'bg-red-900/50 text-red-400'
                            : a.priority === 'medium'
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {a.priority}
                      </span>
                      <span className="text-gray-300">{a.item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 操作栏 */}
          <button
            onClick={handleCopy}
            className="w-full text-center text-gray-500 hover:text-gray-300 text-xs py-1 transition-colors"
          >
            复制总结内容
          </button>
        </div>
      )}
    </div>
  );
}
