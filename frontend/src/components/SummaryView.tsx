'use client';

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ abstract: true, viewpoints: true, glossary: false, actions: true });
  const toggle = (k: string) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  const handleCopy = () => {
    if (!summary) return;
    const text = [
      `# 会话总结 (${sessionId?.slice(0, 8) || 'N/A'})`,
      '', '## 摘要', summary.abstract, '', '## 核心观点',
      ...(summary.key_viewpoints || []).map((v: string) => `- ${v}`),
      '', '## 术语表',
      ...(summary.term_glossary || []).map((t: any) => `- ${t.term} → ${t.translation} (${t.context || ''})`),
      '', '## 行动项',
      ...(summary.action_items || []).map((a: any) => `- [${a.priority}] ${a.item}`),
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-2">
      {sessionEnded && !summary && (
        <button onClick={onGenerate} disabled={loading}
          className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-sm transition-all"
          style={{ background: loading ? '#ccc' : 'linear-gradient(135deg, #7cbd5b, #5a9a3a)' }}>
          {loading ? '正在生成总结...' : '生成AI总结'}
        </button>
      )}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin inline-block w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full mr-2" />
          <span className="text-gray-500 text-sm">AI 正在分析会话...</span>
        </div>
      )}
      {summary && (
        <div className="space-y-2">
          {[
            { key: 'abstract', title: '摘要', content: <p className="text-gray-600 text-sm leading-relaxed">{summary.abstract}</p> },
            { key: 'viewpoints', title: `核心观点 (${summary.key_viewpoints?.length || 0})`,
              content: summary.key_viewpoints?.length ? (
                <ul className="space-y-1">
                  {summary.key_viewpoints.map((v: string, i: number) => (
                    <li key={i} className="text-gray-600 text-sm flex gap-2"><span className="text-green-500 shrink-0">•</span>{v}</li>
                  ))}
                </ul>
              ) : null },
            { key: 'glossary', title: `术语表 (${summary.term_glossary?.length || 0})`,
              content: summary.term_glossary?.length ? (
                <div className="space-y-1">
                  {summary.term_glossary.map((t: any, i: number) => (
                    <div key={i} className="flex items-baseline gap-2 text-sm">
                      <code className="text-green-600 text-xs bg-green-50 px-1.5 py-0.5 rounded">{t.term}</code>
                      <span className="text-gray-600">→ {t.translation}</span>
                      {t.context && <span className="text-gray-400 text-xs">({t.context})</span>}
                    </div>
                  ))}
                </div>
              ) : null },
            { key: 'actions', title: `行动项 (${summary.action_items?.length || 0})`,
              content: summary.action_items?.length ? (
                <div className="space-y-1">
                  {summary.action_items.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                        background: a.priority === 'high' ? '#fce4ec' : a.priority === 'medium' ? '#fff8e1' : '#f5f5f5',
                        color: a.priority === 'high' ? '#f0a0b0' : a.priority === 'medium' ? '#f0a000' : '#999',
                      }}>{a.priority}</span>
                      <span className="text-gray-600">{a.item}</span>
                    </div>
                  ))}
                </div>
              ) : null },
          ].map(({ key, title, content }) => content ? (
            <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
              <button onClick={() => toggle(key)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-700">{title}</span>
                <span className="text-gray-400 text-xs">{expanded[key] ? '收起' : '展开'}</span>
              </button>
              {expanded[key] && <div className="px-3 pb-3">{content}</div>}
            </div>
          ) : null)}
          <button onClick={handleCopy}
            className="w-full text-center text-gray-400 hover:text-gray-600 text-xs py-1 transition-colors">
            复制总结内容
          </button>
        </div>
      )}
    </div>
  );
}
