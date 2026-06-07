'use client';

import { usePathname } from 'next/navigation';

const menu = [
  { href: '/', label: '实时翻译', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
  { href: '/history', label: '字幕记录', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { href: '/glossary', label: '术语库', icon: 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM6.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  { href: '/summary', label: 'AI 总结', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
  { href: '/settings', label: '设置', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.33-.02-.64-.06-.94l2.02-1.58c.18-.14.23-.38.12-.56l-1.89-3.28c-.12-.19-.36-.26-.56-.18l-2.38.96c-.5-.38-1.06-.68-1.66-.88L14.45 3.5c-.04-.2-.2-.34-.4-.34h-3.78c-.2 0-.36.14-.4.34l-.3 2.52c-.6.2-1.16.5-1.66.88l-2.38-.96c-.2-.08-.44-.01-.56.18l-1.89 3.28c-.12.19-.07.42.12.56l2.02 1.58c-.04.3-.06.61-.06.94 0 .33.02.64.06.94l-2.02 1.58c-.18.14-.23.38-.12.56l1.89 3.28c.12.19.36.26.56.18l2.38-.96c.5.38 1.06.68 1.66.88l.3 2.52c.04.2.2.34.4.34h3.78c.2 0 .36-.14.4-.34l.3-2.52c.6-.2 1.16-.5 1.66-.88l2.38.96c.2.08.44.01.56-.18l1.89-3.28c.12-.19.07-.42-.12-.56l-2.02-1.58zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const w = collapsed ? 52 : 210;

  return (
    <aside className="min-h-screen flex flex-col relative transition-all duration-200 ease-out"
      style={{ width: w, background: '#1c1e22', overflow: 'hidden', borderRight: 'none' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-7 pb-5"
        style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--accent)' }}>
          <span className="text-white text-[11px] font-bold">S</span>
        </div>
        {!collapsed && (
          <div className="transition-opacity duration-150">
            <h1 className="text-[13px] font-semibold text-white tracking-tight leading-none">SimulAgent</h1>
            <p className="text-[10px] mt-1" style={{ color: '#8c8b87' }}>同声传译</p>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button onClick={onToggle} className="absolute top-4 -right-2 w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer"
        style={{ background: 'var(--bg-sidebar-hover)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#8c8b87" strokeWidth="3"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 pt-2">
        {menu.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <a key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 text-[12.5px] font-medium transition-all duration-150"
              style={{
                padding: collapsed ? '9px 0' : '7px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius)',
                color: active ? '#ffffff' : '#8c8b87',
                background: active ? 'rgba(212,168,83,0.1)' : 'transparent',
              }}>
              <svg width={collapsed ? "15" : "13"} height={collapsed ? "15" : "13"} viewBox="0 0 24 24"
                fill={active ? 'var(--accent)' : '#8c8b87'} style={{ flexShrink: 0 }}>
                <path d={item.icon} />
              </svg>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {active && <span className="w-1 h-3 rounded-full" style={{ background: 'var(--accent)' }} />}
                </>
              )}
            </a>
          );
        })}
      </nav>

      {/* Version */}
      <div className="px-4 py-4" style={{ textAlign: collapsed ? 'center' : 'left' }}>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>v0.2</span>
      </div>
    </aside>
  );
}
