import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

autoUpdater.autoDownload = false

export function initAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    // 静默处理首次检查失败，不影响应用启动
  })

  autoUpdater.on('update-available', () => {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      win.webContents.send('update:status', { status: 'available' })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      win.webContents.send('update:status', { status: 'downloading', percent: progress.percent })
    }
  })

  autoUpdater.on('update-downloaded', () => {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      win.webContents.send('update:status', { status: 'downloaded' })
    }
  })

  autoUpdater.on('error', () => {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      win.webContents.send('update:status', { status: 'error' })
    }
  })
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates()
}

export function downloadUpdate() {
  return autoUpdater.downloadUpdate()
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall()
}
