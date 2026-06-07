'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-enter">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e05570" strokeWidth="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-800 mb-1">出错了</h2>
      <p className="text-sm text-gray-400 mb-6 max-w-sm text-center">
        {error.message || '页面加载时发生了意外错误，请尝试刷新'}
      </p>
      <button onClick={reset}
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #7c5ce7, #5b3fb8)' }}>
        重新加载
      </button>
    </div>
  );
}
