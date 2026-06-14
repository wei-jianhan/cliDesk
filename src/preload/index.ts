import { contextBridge, ipcRenderer } from 'electron'
import type { IElectronAPI, CreateSessionOptions, SessionInfo } from '../shared/types'

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

  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:select-directory')
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
}

contextBridge.exposeInMainWorld('electronAPI', api)
