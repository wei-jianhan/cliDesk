import { clipboard, contextBridge, ipcRenderer } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import type { IElectronAPI, CreateSessionOptions, SessionInfo, UpdateStatusEvent } from '../shared/types'

const imageExtensions = new Map<string, string>([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
])

function formatFilePaths(raw: string): string {
  const paths = raw.replace(/\0+/g, '\n').trim().split('\n').filter(Boolean)
  return paths.map((p) => (/\s/.test(p) ? `"${p.replace(/"/g, '\\"')}"` : p)).join(' ')
}

function readClipboardImagePath(): string {
  const formats = clipboard.availableFormats()
  const fileFormat = formats.find((format) => format.startsWith('FileName'))
  if (fileFormat) {
    return formatFilePaths(clipboard.read(fileFormat))
  }

  const imageFormat = formats.find((format) => imageExtensions.has(format))
  if (!imageFormat) return ''

  const image = clipboard.readImage()
  if (image.isEmpty()) return ''

  const extension = imageExtensions.get(imageFormat)
  const imagePath = path.join(os.tmpdir(), `clidesk-clipboard-${randomUUID()}.${extension}`)
  const imageData = imageFormat === 'image/jpeg' ? image.toJPEG(95) : image.toPNG()
  fs.writeFileSync(imagePath, imageData)
  return imagePath
}

const api: IElectronAPI = {
  createSession: (options: CreateSessionOptions): Promise<SessionInfo> => {
    return ipcRenderer.invoke('session:create', options)
  },

  startSession: (id: string): Promise<SessionInfo> => {
    return ipcRenderer.invoke('session:start', id)
  },

  stopSession: (id: string): Promise<SessionInfo | undefined> => {
    return ipcRenderer.invoke('session:stop', id)
  },

  removeSession: (id: string): Promise<void> => {
    return ipcRenderer.invoke('session:remove', id)
  },

  listSessions: (): Promise<SessionInfo[]> => {
    return ipcRenderer.invoke('session:list')
  },

  readClipboardForTerminal: async (): Promise<string> => {
    const imagePath = readClipboardImagePath()
    return imagePath || clipboard.readText()
  },

  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-directory')
  },

  copyToClipboard: (text: string) => {
    clipboard.writeText(text)
  },

  writeToTerminal: (sessionId: string, data: string) => {
    ipcRenderer.send('terminal:write', sessionId, data)
  },

  resizeTerminal: (sessionId: string, cols: number, rows: number) => {
    ipcRenderer.send('terminal:resize', sessionId, cols, rows)
  },

  onTerminalData: (callback: (sessionId: string, data: string) => void) => {
    const handler = (_event: any, sessionId: string, data: string) => {
      callback(sessionId, data)
    }
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },

  onSessionStatusChanged: (callback: (session: SessionInfo) => void) => {
    const handler = (_event: any, session: SessionInfo) => {
      callback(session)
    }
    ipcRenderer.on('session:status-changed', handler)
    return () => ipcRenderer.removeListener('session:status-changed', handler)
  },

  onSessionCreated: (callback: (session: SessionInfo) => void) => {
    // Used after createSession resolves, kept for API completeness
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  quitAndInstall: () => ipcRenderer.send('update:install'),

  onUpdateStatus: (callback: (status: UpdateStatusEvent) => void) => {
    const handler = (_event: any, status: UpdateStatusEvent) => {
      callback(status)
    }
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
