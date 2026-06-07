'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/': '实时翻译',
  '/history': '字幕记录',
  '/glossary': '术语库',
  '/summary': 'AI 总结',
  '/settings': '设置',
};

function UserMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white transition-all duration-150 hover:ring-2 hover:ring-offset-1"
        style={{ background: 'var(--accent)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}>
        U
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-enter fixed right-4 top-10 w-44 rounded-lg shadow-md z-50 overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="px-3.5 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>用户</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>user@simulagent.dev</p>
            </div>
            <a href="/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors duration-100"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
              设置
            </a>
            <a href="/history" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors duration-100"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
              字幕记录
            </a>
            <div style={{ borderTop: '1px solid var(--border-light)' }} className="mt-0.5 pt-0.5">
              <button onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] w-full text-left transition-colors duration-100"
                style={{ color: 'var(--danger)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // 悬浮字幕窗口 — 纯展示，无侧边栏和header
  if (pathname === '/popup') {
    return <>{children}</>;
  }

  const pageTitle = PAGE_TITLES[pathname] || (pathname.startsWith('/history/') ? '字幕详情' : '');

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-11 flex items-center justify-between px-5 shrink-0 relative z-30"
          style={{ background: 'rgba(250,250,247,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-1.5 text-[12.5px]">
            <span style={{ color: 'var(--text-tertiary)' }}>SimulAgent</span>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>简体中文</span>
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 mx-auto w-full" style={{ maxWidth: 720 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
