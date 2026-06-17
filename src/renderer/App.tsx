import { useEffect, useCallback, useRef, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { TabBar } from './components/TabBar'
import { SessionSidebar } from './components/SessionSidebar'
import { TerminalView } from './components/TerminalView'
import type { UpdateStatusEvent } from '../shared/types'

const themeOptions = ['深空紫', '经典黑', '海洋蓝', '森林绿', '暖砂棕', '亮白']
const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 480

export default function App() {
  const sidebarVisible = useAppStore((s) => s.sidebarVisible)
  const themeName = useAppStore((s) => s.themeName)
  const setThemeName = useAppStore((s) => s.setThemeName)
  const setSessions = useAppStore((s) => s.setSessions)
  const updateSessionStatus = useAppStore((s) => s.updateSessionStatus)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const isMac = window.navigator.platform.includes('Mac')

  const [sidebarWidth, setSidebarWidth] = useState(256)
  const dragRef = useRef<HTMLDivElement | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusEvent | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta))
      setSidebarWidth(next)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  useEffect(() => {
    window.electronAPI?.listSessions().then(setSessions)
    return window.electronAPI?.onSessionStatusChanged(updateSessionStatus)
  }, [setSessions, updateSessionStatus])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeName)
  }, [themeName])

  useEffect(() => {
    return window.electronAPI?.onUpdateStatus(setUpdateStatus)
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <div className="drag-region flex items-center justify-between h-10 bg-[var(--bg-app)] border-b border-[var(--border-primary)] px-3 select-none">
        <div className={`flex items-center gap-3 ${isMac ? 'ml-14' : ''}`}>
          <span className="text-sm font-semibold text-[var(--accent-text)]">cliDesk</span>
          <span className="text-xs text-[var(--text-muted)]">Claude Code 终端管理器</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <label className="flex items-center gap-1.5 h-7 px-2 rounded-md border border-[var(--border-dropdown)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)]">
            主题
            <select
              value={themeName}
              onChange={(event) => setThemeName(event.target.value)}
              className="w-[82px] rounded border border-[var(--border-input)] bg-[var(--bg-button)] px-1.5 py-0.5 text-xs text-[var(--text-button)] outline-none hover:border-[var(--accent-dark)] focus:border-[var(--accent-light)] focus:ring-2 focus:ring-[var(--accent-focus)]"
              aria-label="主题背景"
            >
              {themeOptions.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={toggleSidebar}
            className="text-[var(--text-dim)] hover:text-[var(--text-primary)] text-xs px-2 py-1 rounded hover:bg-[var(--border-primary)] transition-colors"
          >
            {sidebarVisible ? '隐藏侧栏' : '显示侧栏'}
          </button>
          <span className="w-px h-4 bg-[var(--border-primary)] mx-1" />
          {updateStatus?.status === 'available' ? (
            <button
              onClick={() => window.electronAPI?.downloadUpdate()}
              className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              更新可用
            </button>
          ) : updateStatus?.status === 'downloading' ? (
            <span className="text-xs text-cyan-400">
              下载中 {updateStatus.percent?.toFixed(0)}%
            </span>
          ) : updateStatus?.status === 'downloaded' ? (
            <button
              onClick={() => window.electronAPI?.quitAndInstall()}
              className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              重启安装
            </button>
          ) : updateStatus?.status === 'error' ? (
            <span className="text-xs text-red-400">更新失败</span>
          ) : (
            <button
              onClick={() => window.electronAPI?.checkForUpdates()}
              className="text-[var(--text-dim)] hover:text-[var(--text-primary)] text-xs px-2 py-1 rounded hover:bg-[var(--border-primary)] transition-colors"
            >
              检查更新
            </button>
          )}
          <span className="w-px h-4 bg-[var(--border-primary)] mx-1" />
          <button
            onClick={() => window.electronAPI?.minimizeWindow()}
            className="text-[var(--text-dim)] hover:text-[var(--text-primary)] w-8 h-7 flex items-center justify-center rounded hover:bg-[var(--border-primary)] transition-colors"
            title="最小化"
          >
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
          </button>
          <button
            onClick={() => window.electronAPI?.maximizeWindow()}
            className="text-[var(--text-dim)] hover:text-[var(--text-primary)] w-8 h-7 flex items-center justify-center rounded hover:bg-[var(--border-primary)] transition-colors"
            title="最大化"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
          <button
            onClick={() => window.electronAPI?.closeWindow()}
            className="text-[var(--text-dim)] hover:text-white w-8 h-7 flex items-center justify-center rounded hover:bg-red-600 transition-colors"
            title="关闭"
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <>
            <SessionSidebar width={sidebarWidth} />
            <div
              ref={dragRef}
              onMouseDown={handleMouseDown}
              className="w-1 cursor-col-resize bg-[var(--border-primary)] hover:bg-[var(--accent)] active:bg-[var(--accent)] transition-colors shrink-0"
            />
          </>
        )}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />
          <TerminalView />
        </div>
      </div>
    </div>
  )
}
