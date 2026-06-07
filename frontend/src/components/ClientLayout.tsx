'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';

function UserMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all duration-200 hover:ring-2 hover:ring-green-200 hover:ring-offset-1"
        style={{ background: 'linear-gradient(135deg, #f0a0b0, #d47888)' }}>
        U
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden"
            style={{ animation: 'cardIn 0.15s ease-out' }}>
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-800">用户</p>
              <p className="text-xs text-gray-400 mt-0.5">user@simulagent.dev</p>
            </div>
            {/* Menu items */}
            <a href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
              onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
              设置中心
            </a>
            <a href="/history" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
              onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
              字幕记录
            </a>
            <div className="border-t border-gray-50 mt-1 pt-1">
              <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-pink-500 hover:bg-pink-50 w-full text-left transition-colors duration-150"
                onClick={() => setOpen(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top navbar */}
        <header className="h-14 flex items-center justify-end px-6 border-b border-gray-100 shrink-0"
          style={{ background: 'rgba(250, 252, 253, 0.85)', backdropFilter: 'blur(8px)' }}>
          <UserMenu />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6" style={{ maxWidth: sidebarCollapsed ? '1024px' : '880px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
