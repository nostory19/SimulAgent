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
    <aside className="w-[220px] min-h-screen border-r border-gray-100 flex flex-col" style={{ background: '#fafbfc' }}>
      {/* Logo */}
      <div className="px-5 py-6">
        <h1 className="text-lg font-bold text-gray-800">SimulAgent</h1>
        <p className="text-xs text-gray-400 mt-0.5">实时同声传译助手</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {menu.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-green-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">SimulAgent v0.2</p>
      </div>
    </aside>
  );
}
