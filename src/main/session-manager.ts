import { IPty, spawn } from '@lydell/node-pty'
import { app } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { CreateSessionOptions, SessionInfo, SessionStatus } from '../shared/types'
import { ensureClaudeHookSettings } from './claude-hooks'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getDefaultShell(): string {
  return process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh'
}

function getDefaultCwd(): string {
  return os.homedir() || process.cwd()
}

interface ManagedSession {
  info: SessionInfo
  pty: IPty | null
}

export class SessionManager {
  private sessions = new Map<string, ManagedSession>()
  private statusChangeCallbacks: Array<(session: SessionInfo) => void> = []
  private terminalDataCallbacks: Array<(sessionId: string, data: string) => void> = []
  private readonly sessionsFile = path.join(app.getPath('userData'), 'sessions.json')

  constructor(private readonly getHookUrl: (sessionId: string) => string | null = () => null) {
    this.loadSessions()
  }

  onStatusChanged(cb: (session: SessionInfo) => void) {
    this.statusChangeCallbacks.push(cb)
  }

  onTerminalData(cb: (sessionId: string, data: string) => void) {
    this.terminalDataCallbacks.push(cb)
  }

  createSession(options: CreateSessionOptions): SessionInfo {
    const id = generateId()
    const workingDirectory = options.workingDirectory || getDefaultCwd()
    const startCommand = options.startCommand.trim()
    const info: SessionInfo = {
      id,
      name: options.name.trim() || path.basename(workingDirectory) || `会话 ${this.sessions.size + 1}`,
      status: 'pending',
      createdAt: Date.now(),
      workingDirectory,
      startCommand,
      isStarted: false,
    }

    this.sessions.set(id, { info, pty: null })
    this.persistSessions()
    return { ...info }
  }

  startSession(id: string): SessionInfo | undefined {
    const session = this.sessions.get(id)
    if (!session) return undefined
    if (session.pty) return { ...session.info }

    const shell = getDefaultShell()
    const hookUrl = this.getHookUrl(id)
    if (hookUrl) {
      ensureClaudeHookSettings(session.info.workingDirectory, hookUrl)
    }
    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: session.info.workingDirectory,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        CLIDESK_SESSION_ID: id,
        CLIDESK_HOOK_URL: this.getHookUrl(id) || '',
      },
    })

    session.pty = pty
    session.info = {
      ...session.info,
      status: 'input_required',
      isStarted: true,
      completedAt: undefined,
      exitCode: undefined,
    }
    this.persistSessions()
    this.emitStatus(session.info)

    pty.onData((data: string) => {
      for (const cb of this.terminalDataCallbacks) {
        cb(id, data)
      }
    })

    pty.onExit(({ exitCode }) => {
      const current = this.sessions.get(id)
      if (!current) return

      current.pty = null
      current.info = {
        ...current.info,
        status: 'pending',
        completedAt: Date.now(),
        exitCode,
      }
      this.persistSessions()
      this.emitStatus(current.info)
    })

    if (session.info.startCommand) {
      pty.write(`${session.info.startCommand}\r`)
    }

    return { ...session.info }
  }

  stopSession(id: string): SessionInfo | undefined {
    const session = this.sessions.get(id)
    if (!session) return undefined
    session.pty?.kill()
    session.pty = null
    session.info = {
      ...session.info,
      status: 'pending',
      isStarted: false,
      completedAt: Date.now(),
    }
    this.persistSessions()
    this.emitStatus(session.info)
    return { ...session.info }
  }

  removeSession(id: string) {
    const session = this.sessions.get(id)
    if (session) {
      session.pty?.kill()
      this.sessions.delete(id)
      this.persistSessions()
    }
  }

  writeToTerminal(id: string, data: string) {
    const session = this.sessions.get(id)
    if (session?.pty) {
      session.pty.write(data)
    }
  }

  resizeTerminal(id: string, cols: number, rows: number) {
    const session = this.sessions.get(id)
    if (session?.pty) {
      session.pty.resize(cols, rows)
    }
  }

  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({ ...s.info }))
  }

  updateSessionStatus(id: string, status: SessionStatus) {
    const session = this.sessions.get(id)
    if (!session) return
    session.info = {
      ...session.info,
      status,
    }
    this.persistSessions()
    this.emitStatus(session.info)
  }

  getSession(id: string): SessionInfo | undefined {
    const session = this.sessions.get(id)
    return session ? { ...session.info } : undefined
  }

  destroyAll() {
    for (const [id] of this.sessions) {
      const session = this.sessions.get(id)
      session?.pty?.kill()
    }
  }

  private emitStatus(session: SessionInfo) {
    for (const cb of this.statusChangeCallbacks) {
      cb({ ...session })
    }
  }

  private loadSessions() {
    try {
      if (!fs.existsSync(this.sessionsFile)) return
      const content = fs.readFileSync(this.sessionsFile, 'utf-8')
      const sessions = JSON.parse(content) as SessionInfo[]
      for (const session of sessions) {
        this.sessions.set(session.id, {
          info: {
            ...session,
            status: session.status === 'waiting'
              ? 'waiting'
              : session.status === 'input_required'
                ? 'input_required'
                : 'pending',
            isStarted: false,
          },
          pty: null,
        })
      }
    } catch (error) {
      console.error('Failed to load saved sessions', error)
    }
  }

  private persistSessions() {
    try {
      fs.mkdirSync(path.dirname(this.sessionsFile), { recursive: true })
      fs.writeFileSync(this.sessionsFile, JSON.stringify(this.listSessions(), null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to persist sessions', error)
    }
  }
}
