import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import fs from 'fs';
import path from 'path';

const isDev = !app.isPackaged;

function resolveApiBase(): string {
  const fromEnv = process.env.MESSENGER_API_URL;
  if (fromEnv) return fromEnv;

  const candidates = [
    path.join(process.resourcesPath ?? '', 'config.json'),
    path.join(app.getPath('userData'), 'config.json'),
    path.join(app.getAppPath(), 'config.json'),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as { apiBase?: string };
        if (parsed.apiBase && typeof parsed.apiBase === 'string') {
          return parsed.apiBase;
        }
      }
    } catch {
      void 0;
    }
  }

  return 'http://localhost:3000';
}

const apiBase = resolveApiBase();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    title: 'Messenger',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ipcMain.on('get-api-base', (event) => {
    event.returnValue = apiBase;
  });

  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; img-src 'self' data: blob: http: https:; connect-src http: https: ws: wss:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'",
          ],
        },
      });
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
