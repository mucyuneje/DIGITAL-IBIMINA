'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { currentLanguage } from '@/i18n'
import { AuthProvider } from '@/state/AuthContext'
import { DataProvider } from '@/state/DataContext'
import { ToastProvider } from '@/state/ToastContext'
import { Toaster } from '@/components/ui/toast'
import { ExitWatcher } from '@/components/guards'
import { LoadingScreen } from '@/components/loading-screen'

/**
 * Everything in this app depends on client-only state (localStorage session,
 * demo store, detected language). The mount gate keeps the server HTML empty
 * and renders nothing until hydration is done, so no client value can ever
 * mismatch the prerendered markup. The clock-shaped external store avoids a
 * setState-in-effect (react-hooks/set-state-in-effect).
 */
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function Providers({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  // Keep assistive technology in the detected language without touching the
  // server-rendered `<html lang>` before hydration.
  useEffect(() => {
    document.documentElement.lang = currentLanguage()
  }, [])

  if (!mounted) {
    return <LoadingScreen className="min-h-dvh bg-bg" />
  }

  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <ExitWatcher />
          {children}
          <Toaster />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  )
}
