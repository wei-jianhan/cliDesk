import { app, BrowserWindow, screen } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { HookStatusServer } from './hook-status-server'
import { SessionManager } from './session-manager'
import { initAutoUpdater } from './auto-updater'

let mainWindow: BrowserWindow | null = null
let hookStatusServer: HookStatusServer | null = null
let sessionManager: SessionManager | null = null

function constrainToWorkArea(win: BrowserWindow) {
  const display = screen.getDisplayMatching(win.getBounds())
  const { x, y, width, height } = display.workArea
  win.setBounds({ x, y, width, height })
}

function createWindow() {
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 12, y: 10 } } : {}),
    title: 'cliDesk',
    icon: path.join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('maximize', () => {
    constrainToWorkArea(mainWindow!)
  })

  // Prevent frameless window from covering the taskbar on Windows
  mainWindow.on('will-resize', (_event, newBounds) => {
    const display = screen.getDisplayMatching(newBounds)
    const { y: waY, height: waH } = display.workArea
    // Clamp to work area height
    if (newBounds.y + newBounds.height > waY + waH) {
      newBounds.height = waY + waH - newBounds.y
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  hookStatusServer = new HookStatusServer(({ sessionId, status }) => {
    sessionManager?.updateSessionStatus(sessionId, status)
  })
  await hookStatusServer.start()
  sessionManager = new SessionManager((sessionId) => hookStatusServer ? `${hookStatusServer.url}?sessionId=${encodeURIComponent(sessionId)}` : null)
  registerIpcHandlers(sessionManager)
  createWindow()
  initAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  sessionManager?.destroyAll()
  hookStatusServer?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
