import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authLayer } from '@/services'
import type { AuthState } from '@/services/types'
import { SESSION_IDLE_MS, bypassAuth } from '@/config'
import { setExitReason } from '@/lib/exitReason'

interface AuthContextValue extends AuthState {
  requestOtp: (phone: string) => Promise<void>
  confirmOtp: (code: string) => Promise<void>
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  /** Binds the session to another group the same phone belongs to (R59). */
  switchGroup: (groupId: string) => Promise<void>
  busy: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => authLayer.getState())
  const [busy, setBusy] = useState(false)

  useEffect(() => authLayer.subscribe(setState), [])

  const requestOtp = useCallback(async (phone: string) => {
    setBusy(true)
    try {
      await authLayer.requestOtp(phone)
    } finally {
      setBusy(false)
    }
  }, [])

  const confirmOtp = useCallback(async (code: string) => {
    setBusy(true)
    try {
      await authLayer.confirmOtp(code)
    } finally {
      setBusy(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await authLayer.refresh()
  }, [])

  const signOut = useCallback(async () => {
    await authLayer.signOut()
  }, [])

  const switchGroup = useCallback(async (groupId: string) => {
    await authLayer.switchGroup(groupId)
  }, [])

  // Shared/public device hygiene: idle members are signed out automatically.
  useEffect(() => {
    if (bypassAuth) return
    if (!state.session) return
    const expire = () => {
      setExitReason('idle')
      return void signOut()
    }
    let timer = window.setTimeout(expire, SESSION_IDLE_MS)
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown']
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(expire, SESSION_IDLE_MS)
    }
    events.forEach((event) => window.addEventListener(event, reset))
    document.addEventListener('visibilitychange', reset)
    return () => {
      window.clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, reset))
      document.removeEventListener('visibilitychange', reset)
    }
  }, [state.session, signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, requestOtp, confirmOtp, refresh, signOut, switchGroup, busy }),
    [state, requestOtp, confirmOtp, refresh, signOut, switchGroup, busy],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
