'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AuthModal } from './AuthModal';

const PAGE_TITLES: Record<string, string> = {
  '/': '实时翻译',
  '/history': '字幕记录',
  '/glossary': '术语库',
  '/summary': 'AI 总结',
  '/settings': '设置',
};

// 需要登录才能访问的页面
const PROTECTED = ['/history', '/glossary', '/summary', '/settings'];

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleClick = () => {
    if (!user) { setShowAuth(true); return; }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button onClick={handleClick}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white transition-all duration-150 hover:ring-2 hover:ring-offset-1"
        style={{ background: user ? 'linear-gradient(135deg, #7c5ce7, #5b3fb8)' : '#c4c0b8' }}>
        {user ? user.username.charAt(0).toUpperCase() : '?'}
      </button>

      {user && open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-enter fixed right-4 top-10 w-44 rounded-lg shadow-md z-50 overflow-hidden"
            style={{ background: '#fff', border: '1px solid #e8e6e2' }}>
            <div className="px-3.5 py-3" style={{ borderBottom: '1px solid #f0eeea' }}>
              <p className="text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>{user.username}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#a0a09e' }}>{user.email}</p>
            </div>
            <a href="/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors duration-100"
              style={{ color: '#696967' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
              设置
            </a>
            <div style={{ borderTop: '1px solid #f0eeea' }} className="mt-0.5 pt-0.5">
              <button onClick={() => { logout(); setOpen(false); }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] w-full text-left transition-colors duration-100"
                style={{ color: '#c17d8b' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#faf0f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
      {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
    </div>
  );
}

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // 悬浮窗无chrome
  if (pathname === '/popup') return <>{children}</>;

  // 检查是否需要登录
  const needsAuth = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'));
  const blocked = needsAuth && !loading && !user;

  const pageTitle = PAGE_TITLES[pathname] || (pathname.startsWith('/history/') ? '字幕详情' : '');

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-11 flex items-center justify-between px-5 shrink-0 relative z-30"
          style={{ background: 'rgba(250,250,247,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span style={{ color: '#a0a09e' }}>SimulAgent</span>
            <span style={{ color: '#a0a09e' }}>/</span>
            <span style={{ color: '#1a1a1a', fontWeight: 600 }}>{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: '#a0a09e' }}>简体中文</span>
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-6 mx-auto w-full" style={{ maxWidth: 760 }}>
          {blocked ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.12), rgba(212,168,83,0.04))' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4a853" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>需要登录</h2>
                  <p className="text-[13px] mt-1" style={{ color: '#a0a09e' }}>登录后可查看{pageTitle}内容</p>
                </div>
                <button onClick={() => setShowAuth(true)}
                  className="px-8 py-2.5 rounded-lg text-white text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #7c5ce7, #5b3fb8)' }}>
                  登录 / 注册
                </button>
              </div>
              {showAuth && <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </AuthProvider>
  );
}
