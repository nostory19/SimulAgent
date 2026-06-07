'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766';

interface Term {
  id: string;
  source_term: string;
  standard_translation: string;
  domain: string | null;
  hit_count: number;
}

export default function GlossaryPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [formSource, setFormSource] = useState('');
  const [formTranslation, setFormTranslation] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [saving, setSaving] = useState(false);

  // 从 localStorage 恢复启用状态
  useEffect(() => {
    const saved = localStorage.getItem('glossary_enabled');
    if (saved !== null) setEnabled(saved === 'true');
  }, []);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('glossary_enabled', String(next));
  };

  const loadTerms = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API}/api/v1/glossary${params}`);
      const data = await res.json();
      setTerms(data.terms || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadTerms(); }, [loadTerms]);

  const openAdd = () => {
    setEditing(null);
    setFormSource('');
    setFormTranslation('');
    setFormDomain('');
    setShowForm(true);
  };

  const openEdit = (term: Term) => {
    setEditing(term);
    setFormSource(term.source_term);
    setFormTranslation(term.standard_translation);
    setFormDomain(term.domain || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formSource.trim() || !formTranslation.trim()) return;
    setSaving(true);
    try {
      const body = {
        source_term: formSource.trim(),
        standard_translation: formTranslation.trim(),
        domain: formDomain.trim() || null,
      };
      if (editing) {
        await fetch(`${API}/api/v1/glossary/${editing.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      } else {
        await fetch(`${API}/api/v1/glossary`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      loadTerms();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该术语？')) return;
    try {
      await fetch(`${API}/api/v1/glossary/${id}`, { method: 'DELETE' });
      loadTerms();
    } catch (e) { console.error(e); }
  };

  const inp: React.CSSProperties = {
    background: '#f7f6f3', border: '1.5px solid #e8e6e2', color: '#1a1a1a',
  };

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">术语库</h2>
          <p className="text-xs text-gray-400 mt-0.5">自定义术语映射，翻译时自动应用</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 启用/禁用开关 */}
          <button onClick={toggleEnabled}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: enabled ? '#f0fdf4' : '#f7f6f3',
              color: enabled ? '#16a34a' : '#9ca3af',
              border: enabled ? '1px solid #bbf7d0' : '1px solid #e8e6e2',
            }}>
            <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
            {enabled ? '已启用' : '已禁用'}
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c5ce7, #5b3fb8)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加术语
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索术语..."
          className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl focus:outline-none"
          style={{ ...inp, borderRadius: '12px' }} />
      </div>

      {/* 术语列表 */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
          </div>
        ) : terms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84z" />
                <path d="M4 19h16M4 15h16" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">{search ? '未找到匹配的术语' : '暂无术语'}</p>
            <p className="text-xs text-gray-300 mt-1">{search ? '尝试其他关键词' : '点击「添加术语」开始创建'}</p>
          </div>
        ) : (
          <div>
            {/* 表头 */}
            <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-2.5 text-[11px] font-medium text-gray-400 border-b"
              style={{ borderColor: 'var(--border-light)' }}>
              <span>原文</span>
              <span className="hidden md:block">译文</span>
              <span className="hidden md:block">领域</span>
              <span className="hidden md:block text-right">命中</span>
              <span className="w-16" />
            </div>
            {/* 行 */}
            {terms.map((term) => (
              <div key={term.id}
                className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 text-[13px] border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--border-light)' }}>
                <div className="min-w-0">
                  <span className="font-medium text-gray-800 truncate block">{term.source_term}</span>
                  <span className="text-gray-600 truncate block md:hidden text-[12px] mt-0.5">{term.standard_translation}</span>
                </div>
                <span className="text-gray-600 truncate hidden md:block">{term.standard_translation}</span>
                <span className="text-[11px] hidden md:block">
                  {term.domain ? (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{term.domain}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>
                <span className="text-right text-[12px] text-gray-400 tabular-nums hidden md:block">{term.hit_count}</span>
                <div className="flex items-center gap-1 w-16 justify-end">
                  <button onClick={() => openEdit(term)}
                    className="w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(term.id)}
                    className="w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
            {/* 底部统计 */}
            <div className="px-5 py-2 text-[11px] text-gray-300" style={{ borderTop: '1px solid var(--border-light)' }}>
              共 {total} 条术语
            </div>
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
          <div className="animate-enter-scale bg-white rounded-2xl p-6 w-[420px] max-w-[calc(100vw-32px)]" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
            <h3 className="text-base font-bold text-gray-800 mb-4">{editing ? '编辑术语' : '添加术语'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-medium text-gray-500 mb-1 block">原文术语</label>
                <input value={formSource} onChange={e => setFormSource(e.target.value)}
                  placeholder="例如：backpropagation"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-lg focus:outline-none" style={inp}
                  autoFocus />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-500 mb-1 block">标准译文</label>
                <input value={formTranslation} onChange={e => setFormTranslation(e.target.value)}
                  placeholder="例如：反向传播"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-lg focus:outline-none" style={inp} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-500 mb-1 block">领域标签 <span className="text-gray-300">（可选）</span></label>
                <input value={formDomain} onChange={e => setFormDomain(e.target.value)}
                  placeholder="例如：AI、医学、法律"
                  className="w-full px-3.5 py-2.5 text-[13px] rounded-lg focus:outline-none" style={inp} />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                取消
              </button>
              <button onClick={handleSave} disabled={saving || !formSource.trim() || !formTranslation.trim()}
                className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c5ce7, #5b3fb8)' }}>
                {saving ? '保存中...' : editing ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
