'use client'

import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/state/AuthContext'
import { Navigate, useLocation, useNavigate } from '@/lib/router'
import { readExitReason, setExitReason } from '@/lib/exitReason'
import { LoadingScreen } from '@/components/loading-screen'

/** A branded hold screen while the persisted session is being restored. */
export function Splash() {
  return <LoadingScreen className="min-h-dvh bg-bg" />
}

/** App routes require a signed-in member with a group. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth()
  const location = useLocation()
  if (!ready) return <Splash />
  if (!session) {
    void location
    return <Navigate to="/welcome" replace />
  }
  return <>{children}</>
}

/** Welcome routes bounce an already signed-in member to the app. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth()
  if (!ready) return <Splash />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Sends members who were signed out by the idle timer to the expiry screen. */
export function ExitWatcher() {
  const { ready, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!ready || session) return
    if (readExitReason() !== 'idle') return
    setExitReason(null)
    if (location.pathname !== '/welcome/session-expired') {
      navigate('/welcome/session-expired', { replace: true })
    }
  }, [ready, session, location.pathname, navigate])

  return null
}
