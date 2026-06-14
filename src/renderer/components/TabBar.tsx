import { useAppStore } from '../store/useAppStore'
import { StatusBadge } from './StatusBadge'

export function TabBar() {
  const sessions = useAppStore((s) => s.sessions)
  const startedSessions = sessions.filter((s) => s.isStarted)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const setActiveSession = useAppStore((s) => s.setActiveSession)
  const updateSessionStatus = useAppStore((s) => s.updateSessionStatus)

  if (startedSessions.length === 0) return null

  const handleCloseScreen = async (sessionId: string) => {
    const session = await window.electronAPI?.stopSession(sessionId)
    if (session) {
      updateSessionStatus(session)
    }
  }

  return (
    <div className="flex items-center bg-[var(--bg-app)] border-b border-[var(--border-primary)] overflow-x-auto">
      {startedSessions.map((session) => (
        <div
          key={session.id}
          onClick={() => setActiveSession(session.id)}
          className={`no-drag flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-[var(--border-primary)] min-w-0 transition-colors ${
            activeSessionId === session.id
              ? 'bg-[var(--bg-surface)] text-white border-t-2 border-t-[var(--tab-active-border)]'
              : 'text-[var(--text-dim)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <StatusBadge status={session.status} />
          <span className="text-xs truncate max-w-40">{session.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCloseScreen(session.id)
            }}
            className="text-[var(--text-muted)] hover:text-red-400 ml-1 text-sm leading-none"
            title="关闭终端并结束 Claude Code，保留会话配置"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
