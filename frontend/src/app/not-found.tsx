'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-enter">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">页面不存在</h2>
      <p className="text-sm text-gray-400 mb-6">你访问的页面可能已被移除或路径有误</p>
      <Link href="/"
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #7c5ce7, #5b3fb8)' }}>
        返回首页
      </Link>
    </div>
  );
}
