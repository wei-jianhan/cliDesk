import { useState } from 'react'
import type { CreateSessionOptions } from '../../shared/types'
import { useAppStore } from '../store/useAppStore'
import { getStatusLabel, StatusBadge } from './StatusBadge'
import { NewSessionModal } from './NewSessionModal'

function getPathSummary(workingDirectory: string): string {
  const normalized = workingDirectory.replace(/\\/g, '/')
  const maxLength = 72
  return normalized.length > maxLength
    ? `...${normalized.slice(-maxLength)}`
    : normalized
}

export function SessionSidebar() {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const setActiveSession = useAppStore((s) => s.setActiveSession)
  const removeSession = useAppStore((s) => s.removeSession)
  const addSession = useAppStore((s) => s.addSession)
  const updateSessionStatus = useAppStore((s) => s.updateSessionStatus)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSaveSession = async (options: CreateSessionOptions) => {
    if (!window.electronAPI) return
    const session = await window.electronAPI.createSession(options)
    addSession(session)
    setIsModalOpen(false)
  }

  const handleStart = async (id: string) => {
    if (!window.electronAPI) return
    const session = await window.electronAPI.startSession(id)
    updateSessionStatus(session)
    setActiveSession(id)
  }

  const handleStop = async (id: string) => {
    if (!window.electronAPI) return
    const session = await window.electronAPI.stopSession(id)
    if (session) {
      updateSessionStatus(session)
    }
  }

  const handleRemove = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.removeSession(id)
    }
    removeSession(id)
  }

  const runningCount = sessions.filter((s) => s.status === 'running').length
  const waitingCount = sessions.filter((s) => s.status === 'waiting').length
  const inputRequiredCount = sessions.filter((s) => s.status === 'input_required').length
  const pendingCount = sessions.filter((s) => s.status === 'pending').length

  return (
    <>
      <div className="w-64 bg-[var(--bg-app)] border-r border-[var(--border-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--border-primary)]">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full no-drag px-3 py-2 bg-[var(--accent-dark)] hover:bg-[var(--accent)] text-white text-sm rounded transition-colors focus:outline-none"
          >
            + 新建会话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs text-center py-8 px-3">
              暂无会话
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`no-drag grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 cursor-pointer border-b border-[var(--border-secondary)] transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-[var(--bg-surface)] border-l-2 border-l-[var(--tab-active-border)]'
                    : 'hover:bg-[var(--bg-hover)] border-l-2 border-l-transparent'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={session.status} />
                    <span className="text-xs font-medium truncate">{session.name}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] break-all leading-4" title={`${session.workingDirectory} · ${session.startCommand || '仅打开终端'}`}>
                    {getPathSummary(session.workingDirectory)} · {session.startCommand || '仅打开终端'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 max-w-[74px] px-1.5 py-1 rounded-full text-[10px] bg-[var(--white-5)] border border-[var(--white-10)] text-[var(--text-badge)]">
                    <StatusBadge status={session.status} />
                    {getStatusLabel(session.status)}
                  </span>
                  {session.status === 'pending' ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleStart(session.id)
                      }}
                      className="w-6 h-6 rounded-md border border-[var(--border-accent)] bg-[var(--accent-bg)] text-[var(--accent-text)] text-[11px] hover:bg-[var(--accent-dark)] hover:text-white"
                      title={`在 ${session.workingDirectory} 运行 ${session.startCommand || '终端'}`}
                    >
                      ▶
                    </button>
                  ) : (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleStop(session.id)
                      }}
                      className="w-6 h-6 rounded-md border border-red-500/50 bg-red-600/20 text-red-400 text-xs hover:bg-red-600/40 hover:text-red-300"
                      title="停止终端并关闭标签"
                    >
                      ■
                    </button>
                  )}
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      if (window.confirm(`确定删除会话"${session.name}"吗？此操作不可撤销。`)) {
                        handleRemove(session.id)
                      }
                    }}
                    className="px-1.5 h-6 rounded-md border border-[var(--white-10)] bg-[var(--white-5)] text-[var(--text-dim)] text-[11px] hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30"
                    title="删除会话"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[var(--border-primary)] text-[10px] text-[var(--text-muted)]">
          {runningCount} 任务中 | {waitingCount} 待授权 | {inputRequiredCount} 等待输入 | {pendingCount} 待启动
        </div>
      </div>

      <NewSessionModal
        open={isModalOpen}
        sessionCount={sessions.length}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSession}
      />
    </>
  )
}
