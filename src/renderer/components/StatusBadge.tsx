import type { SessionInfo } from '../../shared/types'

const statusConfig: Record<SessionInfo['status'], { color: string; label: string }> = {
  running: { color: 'bg-cyan-500', label: '任务中' },
  waiting: { color: 'bg-amber-500', label: '待授权' },
  input_required: { color: 'bg-gray-500', label: '等待输入' },
  pending: { color: 'bg-slate-600', label: '待启动' },
}

export function StatusBadge({ status }: { status: SessionInfo['status'] }) {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${config.color}`}
      title={config.label}
    />
  )
}

export function getStatusLabel(status: SessionInfo['status']): string {
  return statusConfig[status].label
}
