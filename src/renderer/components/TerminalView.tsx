import { SessionTerminal } from './SessionTerminal'
import { useAppStore } from '../store/useAppStore'

export function TerminalView() {
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const sessions = useAppStore((s) => s.sessions)
  const themeName = useAppStore((s) => s.themeName)

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center text-[var(--text-muted)]">
          <div className="text-4xl mb-4">&#x2318;</div>
          <p className="text-lg mb-2">还没有会话</p>
          <p className="text-sm">点击左侧"新建会话"保存第一个 Claude Code 终端配置</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[var(--bg-primary)] overflow-hidden relative">
      {sessions.map((session) => (
        session.isStarted ? (
          <SessionTerminal
            key={session.id}
            sessionId={session.id}
            active={session.id === activeSessionId}
            themeName={themeName}
          />
        ) : (
          <div
            key={session.id}
            className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-muted)]"
            style={{ display: session.id === activeSessionId ? undefined : 'none' }}
          >
            <div className="max-w-lg rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 text-center shadow-xl">
              <p className="mb-2 text-lg text-[var(--text-primary)]">{session.name}</p>
              <p className="mb-1 text-sm">工作目录：{session.workingDirectory}</p>
              <p className="text-sm">启动命令：{session.startCommand || '仅打开终端'}</p>
              <p className="mt-4 text-xs text-[var(--text-muted)]">点击左侧会话右侧的 ▶ 按钮启动终端。</p>
            </div>
          </div>
        )
      ))}
    </div>
  )
}
