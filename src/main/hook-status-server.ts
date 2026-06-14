import http from 'http'
import { URL } from 'url'
import { SessionStatus } from '../shared/types'

const HOOK_STATUS_BY_EVENT: Record<string, SessionStatus | undefined> = {
  UserPromptSubmit: 'running',
  PermissionRequest: 'waiting',
  Stop: 'input_required',
  SessionEnd: 'pending',
}

export interface HookStatusEvent {
  sessionId: string
  status: SessionStatus
}

export class HookStatusServer {
  private server: http.Server | null = null
  private port: number | null = null

  constructor(private readonly onStatus: (event: HookStatusEvent) => void) {}

  async start(): Promise<string> {
    if (this.port !== null) {
      return this.url
    }

    await new Promise<void>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handleRequest(req, res)
      })

      server.on('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to bind hook status server'))
          return
        }
        this.server = server
        this.port = address.port
        resolve()
      })
    })

    return this.url
  }

  stop() {
    this.server?.close()
    this.server = null
    this.port = null
  }

  get url(): string {
    if (this.port === null) {
      throw new Error('Hook status server is not started')
    }
    return `http://127.0.0.1:${this.port}/claude-hook`
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method !== 'POST' || !req.url?.startsWith('/claude-hook')) {
      res.writeHead(404).end()
      return
    }

    let body = ''
    req.setEncoding('utf-8')
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      this.handleHookPayload(req.url, body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{}')
    })
  }

  private handleHookPayload(requestUrl: string | undefined, body: string) {
    try {
      const payload = JSON.parse(body) as { hook_event_name?: string }
      const parsedUrl = new URL(requestUrl || '', this.url)
      const sessionId = parsedUrl.searchParams.get('sessionId')
      const status = payload.hook_event_name ? HOOK_STATUS_BY_EVENT[payload.hook_event_name] : undefined
      if (!sessionId || !status) return
      this.onStatus({ sessionId, status })
    } catch {
      return
    }
  }
}
