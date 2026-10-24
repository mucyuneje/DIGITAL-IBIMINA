'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { toast } from '@/components/ui/toast'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id?: number
  tone: ToastTone
  title: string
  body?: string
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, body?: string) => void
  error: (title: string, body?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const push = useCallback((item: Omit<Toast, 'id'>) => {
    toast.add({
      type: item.tone,
      title: item.title,
      description: item.body,
      timeout: 4200,
    })
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, body) => push({ tone: 'success', title, body }),
      error: (title, body) => push({ tone: 'error', title, body }),
    }),
    [push],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
