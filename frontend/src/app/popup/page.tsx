'use client';

/**
 * 浮动同传字幕窗口——连续流式模式。
 *
 * 设计：
 * - 原文（英文）全部累积在上方连续显示
 * - 译文（中文）全部累积在下方连续显示
 * - 流式翻译 token 实时追加
 * - 修正时译文平滑更新
 * - 自动滚动到最新位置
 */
import { useEffect, useState, useRef } from 'react';

export default function PopupPage() {
  const [fullSource, setFullSource] = useState('');         // 全部累积原文
  const [fullTranslation, setFullTranslation] = useState('');  // 全部累积译文
  const [streamingToken, setStreamingToken] = useState('');  // 正在流式输出的翻译token
  const [lastRevised, setLastRevised] = useState(false);     // 最新修正闪烁
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'chinese_only'>('bilingual');
  const [fontSize, setFontSize] = useState(18);
  const [opacity, setOpacity] = useState(0.75);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('simulagent_subtitles');
    channel.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'subtitles') {
        // 连续模式：使用最后一条 subtitles 的完整 source_text 和 translated_text
        if (data.subtitles && data.subtitles.length > 0) {
          const last = data.subtitles[data.subtitles.length - 1];
          setFullSource(last.source_text || '');
          setFullTranslation(last.translated_text || '');
          if (last.is_revised) {
            setLastRevised(true);
            setTimeout(() => setLastRevised(false), 2000);
          }
        }
      } else if (data.type === 'partial') {
        if (data.source) setFullSource(data.source);
        if (data.translation) setStreamingToken(data.translation);
      } else if (data.type === 'settings') {
        if (data.displayMode) setDisplayMode(data.displayMode);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.opacity !== undefined) setOpacity(data.opacity);
      }
    };
    return () => channel.close();
  }, []);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [fullSource, fullTranslation, streamingToken]);

  // 译文 = 累积译文 + 正在生成的流式token
  const displayTranslation = fullTranslation + (streamingToken && !fullTranslation.endsWith(streamingToken) ? streamingToken : '');

  return (
    <main
      className="h-screen overflow-hidden select-none"
      style={{
        background: `rgba(0, 0, 0, ${opacity})`,
        fontSize: `${fontSize}px`,
        padding: '12px 20px',
      }}
    >
      <div ref={scrollRef} className="h-full overflow-y-auto space-y-4 pb-8" style={{ scrollBehavior: 'smooth' }}>
        {!fullSource && !fullTranslation && !streamingToken ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-center">
              等待字幕...
              <br /><span className="text-xs">请在主窗口点击"开始采集"并播放视频</span>
            </p>
          </div>
        ) : (
          <>
            {/* 原文区（英文） */}
            {displayMode === 'bilingual' && (
              <div className={`rounded px-3 py-2 transition-colors duration-500 ${lastRevised ? 'bg-yellow-900/20' : ''}`}>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {fullSource}
                </p>
              </div>
            )}

            {/* 译文区（中文） */}
            <div className={`rounded px-3 py-2 transition-colors duration-500 ${lastRevised ? 'bg-yellow-900/20 border-l-2 border-yellow-500' : ''}`}>
              <p className="text-white leading-relaxed whitespace-pre-wrap break-words font-medium">
                {displayTranslation}
                {/* 流式光标 */}
                {streamingToken && (
                  <span className="inline-block w-1 h-4 bg-green-400 ml-0.5 animate-pulse align-middle" />
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
