'use client'

import type { ReactNode } from 'react'
import { RequireSession } from '@/components/guards'
import { AppShell } from '@/components/app-shell'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  )
}
