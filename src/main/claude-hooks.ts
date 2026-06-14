import fs from 'fs'
import path from 'path'

interface HookSettings {
  hooks?: Record<string, Array<Record<string, unknown>>>
}

function hookGroup(url: string, matcher?: string): Record<string, unknown> {
  return {
    ...(matcher ? { matcher } : {}),
    hooks: [
      {
        type: 'http',
        url,
        timeout: 5,
      },
    ],
  }
}

function hasHookGroup(groups: Array<Record<string, unknown>>, url: string): boolean {
  return groups.some((group) => {
    const hooks = group.hooks
    if (!Array.isArray(hooks)) return false
    return hooks.some((hook) => {
      return typeof hook === 'object' && hook !== null && 'url' in hook && hook.url === url
    })
  })
}

export function ensureClaudeHookSettings(workingDirectory: string, hookUrl: string) {
  const claudeDirectory = path.join(workingDirectory, '.claude')
  const settingsFile = path.join(claudeDirectory, 'settings.local.json')
  fs.mkdirSync(claudeDirectory, { recursive: true })

  const settings: HookSettings = fs.existsSync(settingsFile)
    ? JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    : {}

  const hooks = settings.hooks ?? {}
  const requiredHooks = [
    { event: 'UserPromptSubmit', group: hookGroup(hookUrl) },
    { event: 'PermissionRequest', group: hookGroup(hookUrl, '*') },
    { event: 'Stop', group: hookGroup(hookUrl) },
    { event: 'SessionEnd', group: hookGroup(hookUrl) },
  ]

  for (const { event, group } of requiredHooks) {
    const groups = hooks[event] ?? []
    hooks[event] = hasHookGroup(groups, hookUrl) ? groups : [...groups, group]
  }

  fs.writeFileSync(settingsFile, JSON.stringify({ ...settings, hooks }, null, 2), 'utf-8')
}
