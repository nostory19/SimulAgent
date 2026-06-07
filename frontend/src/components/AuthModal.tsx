'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthModalProps { open: boolean; onClose: () => void; }

function AudioVisualizer() {
  const [bars, setBars] = useState(Array.from({ length: 16 }, () => 8 + Math.random() * 24));
  useEffect(() => {
    const iv = setInterval(() => {
      setBars(prev => prev.map(v => Math.max(4, Math.min(32, v + (Math.random() - 0.5) * 10))));
    }, 400);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex items-end justify-center gap-1.5 h-20">
      {bars.map((h, i) => (
        <div key={i} className="w-2 rounded-full transition-all duration-400"
          style={{ height: h, background: `rgba(212,168,83,${0.3 + (h / 40)})`, animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  );
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!open || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const err = mode === 'login' ? await login(email, password) : await register(email, username, password);
    if (err) setError(err); else onClose();
    setLoading(false);
  };

  const inp: React.CSSProperties = { background: '#f7f6f3', border: '1.5px solid #e8e6e2', color: '#1a1a1a' };

  return createPortal((
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
      <div className="animate-enter-scale flex flex-col md:flex-row rounded-2xl overflow-hidden relative w-[calc(100vw-32px)] max-w-[640px]" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}>
        {/* 关闭按钮 */}
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all"
          style={{ color: '#6b7280', background: 'rgba(0,0,0,0.06)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = '#111827'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = '#6b7280'; }}
          title="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* ===== 左面板：视觉动画（移动端隐藏） ===== */}
        <div className="hidden md:flex w-[300px] flex-col items-center justify-center relative overflow-hidden" style={{ background: '#1a1d23' }}>
          {/* 背景纹理 */}
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
          {/* 装饰圆 */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #7c5ce7, transparent)' }} />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #7c5ce7, transparent)' }} />

          {/* Logo */}
          <div className="relative z-10 mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #7c5ce7, #b8912e)', boxShadow: '0 8px 32px rgba(212,168,83,0.25)' }}>
              <span className="text-white text-xl font-bold">S</span>
            </div>
            <h2 className="text-white text-[15px] font-semibold text-center tracking-tight">SimulAgent</h2>
            <p className="text-[11px] text-center mt-1" style={{ color: '#8c8b87' }}>实时同声传译助手</p>
          </div>

          {/* 音频波形动画 */}
          <div className="relative z-10 mb-4">
            <AudioVisualizer />
          </div>
          <p className="relative z-10 text-[11px] text-center" style={{ color: '#8c8b87' }}>
            {mode === 'login' ? '让全球知识突破语言边界' : '开启你的同声传译之旅'}
          </p>
        </div>

        {/* ===== 右面板：表单 ===== */}
        <div className="flex-1 flex flex-col justify-center bg-white px-6 py-8 md:px-8 md:py-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{mode === 'login' ? '欢迎回来' : '创建账户'}</h2>
            <p className="text-[12px] mt-1" style={{ color: '#a0a09e' }}>{mode === 'login' ? '登录后查看历史记录和AI总结' : '注册即可使用全部功能'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full px-3.5 py-2.5 text-[13px] rounded-lg focus:outline-none" style={inp} type="email" placeholder="邮箱地址" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            {mode === 'register' && <input className="w-full px-3.5 py-2.5 text-[13px] rounded-lg focus:outline-none" style={inp} type="text" placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} required />}
            <input className="w-full px-3.5 py-2.5 text-[13px] rounded-lg focus:outline-none" style={inp} type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} />
            {error && <p className="text-[12px] text-center" style={{ color: '#c17d8b' }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-white text-[13px] font-semibold active:scale-[0.98] transition-all"
              style={{ background: loading ? '#c4c0b8' : 'linear-gradient(135deg, #7c5ce7, #b8912e)' }}>{loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}</button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-[12px] transition-colors" style={{ color: '#a0a09e' }}
              onMouseEnter={e => e.currentTarget.style.color = '#7c5ce7'}
              onMouseLeave={e => e.currentTarget.style.color = '#a0a09e'}>
              {mode === 'login' ? '没有账户？立即注册' : '已有账户？去登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}
