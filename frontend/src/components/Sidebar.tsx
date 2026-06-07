'use client';

import { usePathname } from 'next/navigation';

const menu = [
  { href: '/', label: '实时翻译', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
  { href: '/history', label: '字幕记录', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { href: '/glossary', label: '术语库', icon: 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM6.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  { href: '/summary', label: 'AI 总结', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
  { href: '/settings', label: '设置', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="min-h-screen flex flex-col items-center py-8 px-3 w-[72px] shrink-0"
      style={{ background: '#f7f8fd' }}>
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-8"
        style={{ background: 'linear-gradient(135deg, #7c5ce7, #5b3fb8)', boxShadow: '0 4px 16px rgba(124,92,231,0.3)' }}>
        <span className="text-white text-sm font-bold">S</span>
      </div>

      {/* Navigation — icon above label, vertical centered */}
      <nav className="flex-1 flex flex-col items-center gap-7 pt-2">
        {menu.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <a key={item.href} href={item.href} title={item.label}
              className="flex flex-col items-center gap-1 group transition-all duration-150"
              style={{ color: active ? '#7c5ce7' : '#9ca3af' }}>
              {/* Icon wrapper */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                active ? '' : 'group-hover:bg-gray-100'
              }`}
                style={{ background: active ? '#f4f0fe' : undefined }}>
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={active ? '#7c5ce7' : 'none'}
                  stroke={active ? '#7c5ce7' : '#9ca3af'} strokeWidth={active ? 1.8 : 1.5}
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
              {/* Label */}
              <span className="text-[11px] font-medium leading-tight">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer version */}
      <span className="text-[10px] mt-auto" style={{ color: '#d1d5db' }}>v0.2</span>
    </aside>
  );
}
