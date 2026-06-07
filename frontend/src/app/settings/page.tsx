'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">设置中心</h2>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">关于 SimulAgent</h3>
        <div className="text-sm text-gray-500 space-y-2">
          <p>版本：v0.2.0</p>
          <p>技术栈：FastAPI + Next.js + 百炼云端ASR + 百炼翻译</p>
          <p>ASR引擎：阿里云百炼 fun-asr-realtime</p>
          <p>翻译引擎：阿里云百炼 qwen3-8b</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">环境配置</h3>
        <div className="text-sm text-gray-500 space-y-1">
          <p>BAILIAN_API_KEY: {process.env.BAILIAN_API_KEY ? '已配置 ✓' : '未配置 ✗'}</p>
          <p>后端地址：{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8766'}</p>
          <p>WebSocket：{process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8766/ws'}</p>
        </div>
      </div>
    </div>
  );
}
