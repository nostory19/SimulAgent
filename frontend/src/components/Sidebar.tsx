'use client';

import { usePathname } from 'next/navigation';

const menu = [
  { href: '/', label: '实时翻译', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', desc: '核心' },
  { href: '/history', label: '字幕记录', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z', desc: '回顾' },
  { href: '/glossary', label: '术语库', icon: 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM6.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', desc: '知识' },
  { href: '/summary', label: 'AI总结', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z', desc: '洞察' },
  { href: '/settings', label: '设置中心', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z', desc: '配置' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-h-screen flex flex-col relative" style={{ background: '#fafbfd' }}>
      {/* 底部装饰渐变 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(124, 189, 91, 0.04), transparent)' }} />

      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7cbd5b, #5a9a3a)' }}>
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-800 tracking-tight leading-none">SimulAgent</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">同声传译助手</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {menu.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative"
              style={{
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#1a1a2e' : '#8b909e',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}>
              {/* Icon wrapper */}
              <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  background: active ? 'linear-gradient(135deg, rgba(124,189,91,0.12), rgba(124,189,91,0.06))' : 'transparent',
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? '#5a9a3a' : '#b0b7c3'}>
                  <path d={item.icon} />
                </svg>
              </span>
              <span className="flex-1">{item.label}</span>
              {active && (
                <span className="w-1 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #7cbd5b, #5a9a3a)' }} />
              )}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[11px] text-gray-400">v0.2</span>
        </div>
      </div>
    </aside>
  );
}
