import { app, BrowserWindow, ipcMain, safeStorage, session, shell } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null

function tokenFilePath(): string {
  return join(app.getPath('userData'), 'tokens.bin')
}

interface StoredTokens {
  accessToken: string
  refreshToken: string
}

function readTokens(): StoredTokens | null {
  try {
    const raw = readFileSync(tokenFilePath())
    if (!safeStorage.isEncryptionAvailable()) return null
    const decrypted = safeStorage.decryptString(raw)
    return JSON.parse(decrypted) as StoredTokens
  } catch {
    return null
  }
}

function writeTokens(tokens: StoredTokens): void {
  mkdirSync(app.getPath('userData'), { recursive: true })
  const encrypted = safeStorage.encryptString(JSON.stringify(tokens))
  writeFileSync(tokenFilePath(), encrypted, { mode: 0o600 })
}

function clearTokens(): void {
  try {
    writeFileSync(tokenFilePath(), '')
  } catch {}
}

function registerIpc(): void {
  ipcMain.handle('token:get', () => readTokens())
  ipcMain.handle('token:set', (_event, tokens: StoredTokens) => {
    writeTokens(tokens)
    return { ok: true }
  })
  ipcMain.handle('token:clear', () => {
    clearTokens()
    return { ok: true }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL()
    if (current && url !== current) {
      event.preventDefault()
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url)
      }
    }
  })

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function applySecurityHeaders(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; connect-src 'self' http://localhost:3000 https://*.e2b.app ws://localhost:3000 wss://*.e2b.app; img-src 'self' http://localhost:3000 https://*.e2b.app data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:;"
        ]
      }
    })
  })
}

app.whenReady().then(() => {
  registerIpc()
  applySecurityHeaders()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
