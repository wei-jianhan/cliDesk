import { useState } from 'react'
import type { CreateSessionOptions } from '../../shared/types'

interface NewSessionModalProps {
  open: boolean
  sessionCount: number
  onClose: () => void
  onSave: (options: CreateSessionOptions) => Promise<void>
}

function getNameFromPath(directory: string): string {
  const normalized = directory.replace(/\\/g, '/')
  return normalized.split('/').filter(Boolean).pop() || '新会话'
}

export function NewSessionModal({ open, sessionCount, onClose, onSave }: NewSessionModalProps) {
  const [name, setName] = useState(`会话 ${sessionCount + 1}`)
  const [workingDirectory, setWorkingDirectory] = useState('')
  const [startCommand, setStartCommand] = useState('claude')
  const [isSaving, setIsSaving] = useState(false)

  if (!open) return null

  const handleSelectDirectory = async () => {
    const selected = await window.electronAPI?.selectDirectory()
    if (!selected) return
    setWorkingDirectory(selected)
    setName(getNameFromPath(selected))
  }

  const handleSave = async () => {
    if (!workingDirectory || isSaving) return
    setIsSaving(true)
    await onSave({
      name,
      workingDirectory,
      startCommand,
    })
    setIsSaving(false)
    setName(`会话 ${sessionCount + 2}`)
    setWorkingDirectory('')
    setStartCommand('claude')
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-10 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-[520px] overflow-hidden rounded-2xl border border-[var(--border-input)] bg-gradient-to-b from-[var(--bg-modal)] to-[var(--bg-modal-end)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-primary)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">新建会话</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-dim)]">
              保存会话配置后，可从列表右侧启动按钮在指定目录运行命令。
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded text-xl leading-none text-[var(--text-close)] hover:bg-[var(--bg-button-hover)] hover:text-white"
            title="关闭"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-5">
          <label className="mb-1.5 block text-xs text-[var(--text-label)]">会话名称</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mb-4 h-9 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-light)] focus:ring-2 focus:ring-[var(--accent-focus)]"
          />

          <label className="mb-1.5 block text-xs text-[var(--text-label)]">工作目录</label>
          <div className="mb-1.5 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={workingDirectory}
              readOnly
              placeholder="请选择项目文件夹"
              className="h-9 rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <button
              onClick={handleSelectDirectory}
              className="h-9 rounded-lg border border-[var(--border-button)] bg-[var(--bg-button)] px-3 text-sm text-[var(--text-button)] hover:border-[var(--accent)] hover:bg-[var(--bg-button-hover)]"
            >
              选择文件夹
            </button>
          </div>
          <p className="mb-4 text-[11px] text-[var(--text-muted)]">点击后弹出系统目录选择框，确认后记录路径。</p>

          <label className="mb-1.5 block text-xs text-[var(--text-label)]">默认启动命令</label>
          <input
            value={startCommand}
            onChange={(event) => setStartCommand(event.target.value)}
            className="mb-1.5 h-9 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-light)] focus:ring-2 focus:ring-[var(--accent-focus)]"
          />
          <p className="mb-4 text-[11px] text-[var(--text-muted)]">默认值为 claude；留空则只打开终端。</p>

          <div className="mb-4 rounded-xl border border-[var(--white-10)] bg-[var(--bg-preview)] p-3">
            <div className="mb-2 text-xs font-semibold text-[var(--text-button)]">启动预览</div>
            <div className="grid grid-cols-[58px_1fr] gap-2 text-[11px] leading-5 text-[var(--text-dim)]">
              <span>名称</span><code className="truncate text-[var(--text-label)]">{name || '未命名'}</code>
              <span>目录</span><code className="truncate text-[var(--text-label)]">{workingDirectory || '未选择'}</code>
              <span>命令</span><code className="truncate text-[var(--text-label)]">{startCommand || '仅打开终端'}</code>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="h-9 rounded-lg border border-[var(--border-button)] bg-[var(--bg-button)] px-4 text-sm text-[var(--text-button)] hover:border-[var(--accent)] hover:bg-[var(--bg-button-hover)]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!workingDirectory || isSaving}
              className="h-9 rounded-lg bg-[var(--accent-dark)] px-4 text-sm text-white hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              保存会话
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
