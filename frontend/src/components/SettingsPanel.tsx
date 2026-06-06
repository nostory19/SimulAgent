'use client';

/**
 * 字幕显示设置面板。
 *
 * 功能：
 * - 字幕显示模式切换（双语/仅中文）
 * - 字体大小调节
 * - 窗口透明度调节
 * - 设置持久化到 localStorage
 */
import { useState, useEffect } from 'react';

interface SettingsPanelProps {
  displayMode: 'bilingual' | 'chinese_only';
  onDisplayModeChange: (mode: 'bilingual' | 'chinese_only') => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export function SettingsPanel({
  displayMode,
  onDisplayModeChange,
  fontSize,
  onFontSizeChange,
  opacity,
  onOpacityChange,
}: SettingsPanelProps) {
  const [collapsed, setCollapsed] = useState(true);

  // 从 localStorage 恢复设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('simulagent_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fontSize) onFontSizeChange(parsed.fontSize);
        if (parsed.opacity !== undefined) onOpacityChange(parsed.opacity);
        if (parsed.displayMode) onDisplayModeChange(parsed.displayMode);
      }
    } catch {
      // 忽略解析错误
    }
  }, []);

  // 设置变更时自动持久化
  const saveAndSet = (key: string, value: any, setter: (v: any) => void) => {
    setter(value);
    try {
      const existing = JSON.parse(localStorage.getItem('simulagent_settings') || '{}');
      existing[key] = value;
      localStorage.setItem('simulagent_settings', JSON.stringify(existing));
    } catch {
      // 忽略
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 text-white text-sm">
      {/* 折叠标题 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-gray-300 hover:text-white"
      >
        <span className="font-medium">字幕设置</span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          {/* 显示模式 */}
          <label className="flex items-center justify-between">
            <span className="text-gray-400">显示模式</span>
            <select
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              value={displayMode}
              onChange={(e) =>
                saveAndSet('displayMode', e.target.value, onDisplayModeChange)
              }
            >
              <option value="bilingual">双语</option>
              <option value="chinese_only">仅中文</option>
            </select>
          </label>

          {/* 字体大小 */}
          <label className="flex items-center justify-between">
            <span className="text-gray-400">字体大小: {fontSize}px</span>
            <input
              type="range"
              min="12"
              max="32"
              value={fontSize}
              onChange={(e) =>
                saveAndSet('fontSize', Number(e.target.value), onFontSizeChange)
              }
              className="w-24"
            />
          </label>

          {/* 透明度 */}
          <label className="flex items-center justify-between">
            <span className="text-gray-400">透明度: {Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min="30"
              max="100"
              value={Math.round(opacity * 100)}
              onChange={(e) =>
                saveAndSet('opacity', Number(e.target.value) / 100, onOpacityChange)
              }
              className="w-24"
            />
          </label>
        </div>
      )}
    </div>
  );
}
