'use client';

/** 显示设置面板：字体大小、透明度。主题：白色卡片 + 草绿滑块。 */
interface SettingsPanelProps {
  displayMode: 'bilingual' | 'chinese_only';
  onDisplayModeChange: (mode: 'bilingual' | 'chinese_only') => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export function SettingsPanel({ fontSize, onFontSizeChange, opacity, onOpacityChange }: SettingsPanelProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium mb-1">字体大小</p>
          <input type="range" min={12} max={32} value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="w-full accent-green-500" />
          <p className="text-xs text-gray-400 text-right">{fontSize}px</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium mb-1">透明度</p>
          <input type="range" min={30} max={100} value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="w-full accent-pink-400" />
          <p className="text-xs text-gray-400 text-right">{Math.round(opacity * 100)}%</p>
        </div>
      </div>
    </div>
  );
}
