/**
 * Electron 主进程
 *
 * 创建 SimulAgent 桌面窗口：
 * - alwaysOnTop: 始终保持在所有窗口之上
 * - frame: false: 无边框（透明浮动窗口）
 * - transparent: true: 背景透明
 *
 * 开发环境加载 Next.js dev server（localhost:3000），
 * 生产环境加载构建后的静态文件。
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // 创建透明浮动字幕窗口
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: 0,
    y: 100,
    alwaysOnTop: true,   // 始终置顶
    frame: false,        // 无边框
    transparent: true,   // 透明背景
    skipTaskbar: true,   // 不在任务栏显示
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // 启用上下文隔离（安全）
      nodeIntegration: false,
    },
  });

  // 根据环境加载不同的前端入口
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  // 确保窗口在所有工作区可见
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC 处理：音频源查询（Electron desktopCapturer）
ipcMain.handle('get-audio-sources', async () => {
  // 完整的系统音频采集由后端 WASAPI loopback 处理
  return [];
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
