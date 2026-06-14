import { create } from 'zustand'
import type { SessionInfo } from '../../shared/types'

interface AppState {
  sessions: SessionInfo[]
  activeSessionId: string | null
  sidebarVisible: boolean
  themeName: string

  setSessions: (sessions: SessionInfo[]) => void
  addSession: (session: SessionInfo) => void
  removeSession: (id: string) => void
  setActiveSession: (id: string) => void
  updateSessionStatus: (session: SessionInfo) => void
  setThemeName: (themeName: string) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sessions: [],
  activeSessionId: null,
  sidebarVisible: true,
  themeName: '深空紫',

  setSessions: (sessions) =>
    set((state) => ({
      sessions,
      activeSessionId: state.activeSessionId ?? sessions[0]?.id ?? null,
    })),

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: state.activeSessionId || session.id,
    })),

  removeSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      const activeSessionId =
        state.activeSessionId === id
          ? sessions.length > 0
            ? sessions[0].id
            : null
          : state.activeSessionId
      return { sessions, activeSessionId }
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  updateSessionStatus: (updated) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
    })),

  setThemeName: (themeName) => set({ themeName }),

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
}))
