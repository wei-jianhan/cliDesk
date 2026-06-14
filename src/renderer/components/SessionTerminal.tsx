import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'

function getTerminalTheme() {
  const s = getComputedStyle(document.documentElement)
  return {
    background: s.getPropertyValue('--bg-primary').trim() || '#0d0d1a',
    foreground: s.getPropertyValue('--text-primary').trim() || '#e0e0f0',
    cursor: s.getPropertyValue('--accent').trim() || '#6366f1',
    cursorAccent: s.getPropertyValue('--bg-primary').trim() || '#0d0d1a',
    selectionBackground: `${s.getPropertyValue('--accent').trim() || '#6366f1'}44`,
    black: s.getPropertyValue('--bg-surface').trim() || '#1a1a2e',
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#f59e0b',
    blue: s.getPropertyValue('--accent').trim() || '#6366f1',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: s.getPropertyValue('--text-primary').trim() || '#e0e0f0',
    brightBlack: s.getPropertyValue('--text-muted').trim() || '#444466',
    brightRed: '#f87171',
    brightGreen: '#4ade80',
    brightYellow: '#fbbf24',
    brightBlue: s.getPropertyValue('--accent-light').trim() || '#818cf8',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  }
}

interface Props {
  sessionId: string
  active: boolean
  themeName: string
}

export function SessionTerminal({ sessionId, active, themeName }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  // Create xterm on mount
  useEffect(() => {
    if (!containerRef.current) return

    // Batch rapid PTY output chunks into one write per animation frame
    let writeBuffer = ''
    let rafPending = false

    const flushWrite = (t: XTerm) => {
      if (writeBuffer.length > 0) {
        t.write(writeBuffer)
        writeBuffer = ''
      }
      rafPending = false
    }

    const term = new XTerm({
      theme: getTerminalTheme(),
      fontFamily: "'Cascadia Code', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', monospace",
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: 10000,
      ...(navigator.platform.startsWith('Win') ? { windowsPty: { backend: 'conpty' } } : {}),
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    // WebGL renderer for better performance
    try {
      term.loadAddon(new WebglAddon())
    } catch {
      // Fall back to canvas renderer if WebGL unavailable
    }

    term.open(containerRef.current)

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Keyboard input → main process
    term.onData((data) => {
      window.electronAPI?.writeToTerminal(sessionId, data)
    })

    // Sync terminal size to PTY so TUI apps render correctly
    term.onResize(({ cols, rows }) => {
      window.electronAPI?.resizeTerminal(sessionId, cols, rows)
    })

    // Main process → terminal output (batched per frame)
    const handleData = (_sid: string, data: string) => {
      if (_sid === sessionId) {
        writeBuffer += data
        if (!rafPending) {
          rafPending = true
          requestAnimationFrame(() => flushWrite(term))
        }
      }
    }
    const unsubTerminalData = window.electronAPI?.onTerminalData(handleData)

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    const observer = new ResizeObserver(() => fitAddon.fit())
    observer.observe(containerRef.current)
    observerRef.current = observer

    // Defer initial fit until ResizeObserver is active and layout is complete
    requestAnimationFrame(() => fitAddon.fit())

    return () => {
      unsubTerminalData?.()
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
      term.dispose()
    }
  }, [])

  // Focus when becoming active
  useEffect(() => {
    if (active && xtermRef.current) {
      // Delay to ensure display switches before focus
      requestAnimationFrame(() => xtermRef.current?.focus())
    }
    if (active && fitAddonRef.current) {
      requestAnimationFrame(() => fitAddonRef.current?.fit())
    }
  }, [active])

  // Sync terminal theme when theme name changes
  useEffect(() => {
    const term = xtermRef.current
    if (!term) return
    try {
      term.setOption('theme', getTerminalTheme())
    } catch {
      // Fallback for older xterm.js versions
      term.options.theme = getTerminalTheme()
    }
    // Force full redraw – WebGL renderer needs explicit refresh
    if (term.rows > 0) {
      term.refresh(0, term.rows - 1)
    }
    fitAddonRef.current?.fit()
  }, [themeName])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-[var(--bg-primary)] overflow-hidden"
      style={{ display: active ? undefined : 'none' }}
    />
  )
}
