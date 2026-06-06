import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: 0,
    y: 100,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development, load from Next.js dev server; in production, load built files
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers for audio capture from Electron main process
ipcMain.handle('get-audio-sources', async () => {
  // In Electron, we can use desktopCapturer for tab/system audio
  // For full system audio, the backend handles it via WASAPI
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
