import { ipcMain, BrowserWindow, screen, dialog } from 'electron'
import { SessionManager } from './session-manager'
import { CreateSessionOptions } from '../shared/types'
import { sendNotification } from './notification'
import { checkForUpdates, downloadUpdate, quitAndInstall } from './auto-updater'

let preMaximizeBounds: { x: number; y: number; width: number; height: number } | null = null

export function registerIpcHandlers(sessionManager: SessionManager) {
  ipcMain.handle('session:create', (_event, options: CreateSessionOptions) => {
    return sessionManager.createSession(options)
  })

  ipcMain.handle('session:start', (_event, id: string) => {
    return sessionManager.startSession(id)
  })

  ipcMain.handle('session:stop', (_event, id: string) => {
    return sessionManager.stopSession(id)
  })

  ipcMain.handle('session:remove', (_event, id: string) => {
    sessionManager.removeSession(id)
  })

  ipcMain.handle('session:list', () => {
    return sessionManager.listSessions()
  })

  ipcMain.handle('dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Terminal write: one-way from renderer to pty (no response needed)
  ipcMain.on('terminal:write', (_event, sessionId: string, data: string) => {
    sessionManager.writeToTerminal(sessionId, data)
  })

  ipcMain.on('terminal:resize', (_event, sessionId: string, cols: number, rows: number) => {
    sessionManager.resizeTerminal(sessionId, cols, rows)
  })

  // Forward terminal data from pty to renderer
  sessionManager.onTerminalData((sessionId, data) => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('terminal:data', sessionId, data)
    }
  })

  // Forward session status changes to renderer + notify on input_required
  sessionManager.onStatusChanged((session) => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('session:status-changed', session)
    }
    if (session.status === 'input_required') {
      sendNotification({
        title: session.name,
        body: '会话等待输入，请查看终端。',
      })
    }
  })

  // Window controls
  ipcMain.on('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return

    if (preMaximizeBounds) {
      win.setBounds(preMaximizeBounds)
      preMaximizeBounds = null
    } else {
      preMaximizeBounds = win.getBounds()
      const { workArea } = screen.getDisplayMatching(preMaximizeBounds)
      win.setBounds(workArea)
    }
  })

  ipcMain.on('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  // Update handlers
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', () => downloadUpdate())
  ipcMain.handle('update:install', () => quitAndInstall())
}
