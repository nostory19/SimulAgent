'use client';

import { usePathname } from 'next/navigation';

const menu = [
  { href: '/', label: '实时翻译', icon: '🎙' },
  { href: '/history', label: '字幕记录', icon: '📜' },
  { href: '/glossary', label: '术语库', icon: '📚' },
  { href: '/summary', label: 'AI总结', icon: '📝' },
  { href: '/settings', label: '设置中心', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-h-screen flex flex-col border-r border-gray-100" style={{ background: '#fafcfd' }}>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-gray-50">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">SimulAgent</h1>
        <p className="text-xs text-gray-400 mt-0.5">实时同声传译助手</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menu.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-green-50 text-green-700 shadow-sm border border-green-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-50">
        <p className="text-xs text-gray-300">SimulAgent v0.2.0</p>
      </div>
    </aside>
  );
}
