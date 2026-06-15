// cliDesk 共享类型定义

export type SessionStatus = 'running' | 'waiting' | 'input_required' | 'pending'

export interface SessionInfo {
  id: string
  name: string
  status: SessionStatus
  createdAt: number
  completedAt?: number
  workingDirectory: string
  startCommand: string
  isStarted: boolean
  exitCode?: number
}

export interface CreateSessionOptions {
  name: string
  workingDirectory: string
  startCommand: string
}

export interface IElectronAPI {
  createSession: (options: CreateSessionOptions) => Promise<SessionInfo>
  startSession: (id: string) => Promise<SessionInfo>
  stopSession: (id: string) => Promise<SessionInfo | undefined>
  removeSession: (id: string) => Promise<void>
  listSessions: () => Promise<SessionInfo[]>
  selectDirectory: () => Promise<string | null>
  readClipboardForTerminal: () => Promise<string>
  copyToClipboard: (text: string) => void
  writeToTerminal: (sessionId: string, data: string) => void
  resizeTerminal: (sessionId: string, cols: number, rows: number) => void
  onTerminalData: (callback: (sessionId: string, data: string) => void) => () => void
  onSessionStatusChanged: (callback: (session: SessionInfo) => void) => () => void
  onSessionCreated: (callback: (session: SessionInfo) => void) => void
  removeAllListeners: (channel: string) => void
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
