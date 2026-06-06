/**
 * Electron 预加载脚本
 *
 * 通过 contextBridge 安全地向渲染进程暴露有限的 API，
 * 避免直接暴露 Node.js 或 Electron 的完整能力。
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  /** 获取可用的音频采集源 */
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  /** 当前操作系统平台 */
  platform: process.platform,
});
