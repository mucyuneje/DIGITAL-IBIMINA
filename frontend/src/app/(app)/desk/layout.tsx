'use client'

import type { ReactNode } from 'react'
import { DeskFrame } from '@/screens/desk/DeskFrame'

export default function Layout({ children }: { children: ReactNode }) {
  return <DeskFrame>{children}</DeskFrame>
}
